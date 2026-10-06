"use client";

import { useEffect, useRef } from "react";
// Types only: the Cesium runtime is the prebuilt bundle served from
// public/cesium (see loadCesium), so Next.js never has to bundle it.
import type * as CesiumModule from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import type {
  AircraftMapApi,
  AircraftUpdate,
  CameraMode,
  FlightZone,
} from "@/lib/aircraft/types";
import { getAircraftZoneState } from "@/lib/aircraft/zones";

type Cesium = typeof CesiumModule;

const CESIUM_BASE_URL = "/cesium"; // public/cesium, see scripts/copy-cesium-assets.mjs
// Used for aircraft without a `modelUrl`, and when theirs fails to load.
const DEFAULT_AIRCRAFT_MODEL_URL = "/models/aircraft.glb";

const FEET_TO_METERS = 0.3048;

// The aircraft is rendered this far behind the newest update, so there is
// always a "next" sample to interpolate toward (must exceed the update interval).
const INTERPOLATION_BUFFER_S = 1.5;

// Overview camera (initial view and Reset): distance from the centre of the
// flight area and downward tilt.
const OVERVIEW_RANGE_M = 40_000;
const OVERVIEW_PITCH_DEG = -35;

type ModelSettings = {
  /** Size multiplier; an aircraft's own `modelScale` takes precedence. */
  scale: number;
  /** Keeps the aircraft visible from far away; true scale up close. */
  minimumPixelSize: number;
  maximumScale: number;
  // Degrees added to the reported attitude, for models whose native
  // orientation differs. A heading offset of 0 suits models whose nose points
  // along Cesium's +X axis (glTF +Z), like the Cesium Air sample. Use
  // 90 / -90 / 180 if a model appears to fly sideways or backwards.
  headingOffset: number;
  pitchOffset: number;
  rollOffset: number;
};

const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  scale: 1,
  minimumPixelSize: 72,
  maximumScale: 4000,
  headingOffset: 0,
  pitchOffset: 0,
  rollOffset: 0,
};

// Per-model overrides of the defaults above, keyed by model URL. Add an entry
// when a model needs a different size or orientation. Sources and licenses
// of the model files are listed in public/models/CREDITS.md.
const MODEL_SETTINGS: Record<string, Partial<ModelSettings>> = {
  // Airliner, modelled in centimeter-like units: scaled to a ~31 m wingspan.
  "/models/aircraft-1.glb": { scale: 0.02 },
  // Light propeller aircraft, already in meters, but its nose points along
  // glTF -Z, so it is turned around.
  "/models/aircraft-2.glb": { headingOffset: 180 },
  // Jet trainer: scaled to a ~10 m wingspan.
  "/models/aircraft-3.glb": { scale: 0.075 },
};

// Whether each model URL can actually be loaded, checked once per URL.
const modelChecks = new Map<string, Promise<boolean>>();

function isModelAvailable(url: string) {
  let check = modelChecks.get(url);
  if (!check) {
    check = fetch(url, { method: "HEAD" }).then(
      (response) => response.ok,
      () => false,
    );
    check.then((available) => {
      if (!available) {
        console.warn(
          `Aircraft model ${url} not found, using ${DEFAULT_AIRCRAFT_MODEL_URL} instead.`,
        );
      }
    });
    modelChecks.set(url, check);
  }
  return check;
}

let cesiumPromise: Promise<Cesium> | undefined;

function loadCesium(): Promise<Cesium> {
  cesiumPromise ??= new Promise<Cesium>((resolve, reject) => {
    const globals = window as unknown as {
      CESIUM_BASE_URL: string;
      Cesium: Cesium;
    };
    // Tells Cesium where its workers, assets and widget images live.
    globals.CESIUM_BASE_URL = CESIUM_BASE_URL;

    const script = document.createElement("script");
    script.src = `${CESIUM_BASE_URL}/Cesium.js`;
    script.async = true;
    script.onload = () => resolve(globals.Cesium);
    script.onerror = () => {
      cesiumPromise = undefined;
      reject(new Error(`Failed to load ${script.src}`));
    };
    document.head.appendChild(script);
  });
  return cesiumPromise;
}

type AircraftTrack = {
  entity: CesiumModule.Entity;
  position: CesiumModule.SampledPositionProperty;
  orientation: CesiumModule.SampledProperty;
  trail: CesiumModule.PolylineGlowMaterialProperty;
  /** The model this aircraft asked for, and the settings of the one shown. */
  modelUrl: string | undefined;
  modelScale: number | undefined;
  modelSettings: ModelSettings;
  lastPoint: CesiumModule.Cartesian3;
  lastHeading: number;
  lastReport: AircraftUpdate | undefined;
};

type ZoneAlert = "idle" | "approaching" | "inside";

type ZoneRecord = {
  zone: FlightZone;
  entity: CesiumModule.Entity;
  /** Aircraft currently inside or approaching this zone, by aircraft id. */
  aircraftStates: Map<string, "inside" | "approaching">;
  fill: CesiumModule.Color;
  outline: CesiumModule.Color;
};

const ZONE_COLORS: Record<NonNullable<FlightZone["type"]>, string> = {
  normal: "#34d399",
  warning: "#fbbf24",
  restricted: "#f87171",
};

const ZONE_FILL_ALPHA: Record<ZoneAlert, number> = {
  idle: 0.14,
  approaching: 0.26,
  inside: 0.4,
};

const feet = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function createAircraftScene(
  Cesium: Cesium,
  container: HTMLDivElement,
  center: { lat: number; lng: number },
  onSelect: (id: string) => void,
) {
  const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
  if (token) Cesium.Ion.defaultAccessToken = token;

  const viewer = new Cesium.Viewer(container, {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
  });
  const { scene, clock, camera } = viewer;

  // Let mountains hide the parts of the trail that are behind them.
  scene.globe.depthTestAgainstTerrain = true;

  // Light the scene from the camera so the aircraft is never in the dark,
  // whatever time of day the tracking timestamps fall on.
  const light = new Cesium.DirectionalLight({ direction: camera.directionWC });
  scene.light = light;
  const removeLightListener = scene.preRender.addEventListener(() => {
    light.direction = Cesium.Cartesian3.clone(
      camera.directionWC,
      light.direction,
    );
  });

  Cesium.createOsmBuildingsAsync()
    .then((buildings) => {
      if (!viewer.isDestroyed()) scene.primitives.add(buildings);
    })
    .catch(() => {
      // Buildings are a nice-to-have; the demo works without them.
    });

  // Local frame with X = north, Y = west, Z = up, so heading 0 points the
  // model's nose north and positive heading turns clockwise (compass convention).
  const northWestUpFrame = Cesium.Transforms.localFrameToFixedFrameGenerator(
    "north",
    "west",
  );

  const selectedTrailColor = Cesium.Color.fromCssColorString("#38bdf8");
  const trailColor = Cesium.Color.WHITE.withAlpha(0.45);

  // aircraft id -> everything the scene keeps for that aircraft. Each one
  // owns its entity, samples and trail, so they animate independently.
  const tracks = new Map<string, AircraftTrack>();
  let selectedId: string | null = null;
  let latestTime: CesiumModule.JulianDate | undefined;
  let cameraMode: CameraMode = "free";

  // zone id -> its entity and current alert state. Zones are drawn as true
  // 3D volumes: a polygon extruded from the zone's floor to its ceiling.
  const zoneRecords = new Map<string, ZoneRecord>();

  function styleZone(record: ZoneRecord) {
    const states = Array.from(record.aircraftStates.values());
    const alert: ZoneAlert = states.includes("inside")
      ? "inside"
      : states.length > 0
        ? "approaching"
        : "idle";
    const type = record.zone.type ?? "normal";
    const violation = type === "restricted" && alert === "inside";
    const base = Cesium.Color.fromCssColorString(ZONE_COLORS[type]);

    // Read by the entity's callback properties, so a state change only
    // recolors the existing geometry instead of rebuilding it.
    record.fill = base.withAlpha(violation ? 0.55 : ZONE_FILL_ALPHA[alert]);
    record.outline = violation
      ? Cesium.Color.WHITE
      : base.withAlpha(alert === "idle" ? 0.7 : 1);

    const { name, minAltitude, maxAltitude } = record.zone;
    const text = `${name}\n${feet.format(minAltitude)} ft – ${feet.format(maxAltitude)} ft`;
    record.entity.label!.text = new Cesium.ConstantProperty(
      violation ? `${text}\nVIOLATION` : text,
    );
  }

  /** Re-evaluates one aircraft against one zone; true if the zone changed. */
  function evaluateZone(
    record: ZoneRecord,
    aircraftId: string,
    report: AircraftUpdate,
  ) {
    const state = getAircraftZoneState(report, record.zone);
    const previous = record.aircraftStates.get(aircraftId);
    const next =
      state === "inside" || state === "approaching" ? state : undefined;
    if (next === previous) return false;
    if (next) record.aircraftStates.set(aircraftId, next);
    else record.aircraftStates.delete(aircraftId);
    return true;
  }

  function createZone(zone: FlightZone): ZoneRecord {
    const { coordinates, minAltitude, maxAltitude } = zone;
    const count = Math.max(coordinates.length, 1);
    const center = Cesium.Cartesian3.fromDegrees(
      coordinates.reduce((sum, c) => sum + c.lng, 0) / count,
      coordinates.reduce((sum, c) => sum + c.lat, 0) / count,
      maxAltitude * FEET_TO_METERS,
    );

    const entity = viewer.entities.add({
      name: zone.name,
      position: center,
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(
          coordinates.flatMap((c) => [c.lng, c.lat]),
        ),
        // Zone altitudes are in feet; Cesium heights are in meters.
        height: minAltitude * FEET_TO_METERS,
        extrudedHeight: maxAltitude * FEET_TO_METERS,
        material: new Cesium.ColorMaterialProperty(
          new Cesium.CallbackProperty(() => record.fill, false),
        ),
        outline: true,
        outlineColor: new Cesium.CallbackProperty(() => record.outline, false),
      },
      label: {
        font: "12px sans-serif",
        showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.55),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -6),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    const record: ZoneRecord = {
      zone,
      entity,
      aircraftStates: new Map(),
      fill: Cesium.Color.TRANSPARENT,
      outline: Cesium.Color.TRANSPARENT,
    };
    for (const [id, track] of tracks) {
      if (track.lastReport) evaluateZone(record, id, track.lastReport);
    }
    styleZone(record);
    return record;
  }

  // Syncs the scene with a zone list: adds new zones, rebuilds only the ones
  // whose definition changed (a new object for the same id) and removes the
  // ones that are gone.
  function setZones(zones: FlightZone[]) {
    const ids = new Set(zones.map((zone) => zone.id));
    for (const [id, record] of zoneRecords) {
      if (ids.has(id)) continue;
      viewer.entities.remove(record.entity);
      zoneRecords.delete(id);
    }
    for (const zone of zones) {
      const existing = zoneRecords.get(zone.id);
      if (existing?.zone === zone) continue;
      if (existing) viewer.entities.remove(existing.entity);
      zoneRecords.set(zone.id, createZone(zone));
    }
  }

  function showModel(track: AircraftTrack, uri: string) {
    const settings = { ...DEFAULT_MODEL_SETTINGS, ...MODEL_SETTINGS[uri] };
    track.modelSettings = settings;
    track.entity.model = new Cesium.ModelGraphics({
      uri,
      scale: track.modelScale ?? settings.scale,
      minimumPixelSize: settings.minimumPixelSize,
      maximumScale: settings.maximumScale,
    });
  }

  // Gives one aircraft its model. Aircraft may share a model or each have
  // their own; a model that cannot be loaded is replaced by the default one.
  function setTrackModel(
    track: AircraftTrack,
    modelUrl: string | undefined,
    modelScale: number | undefined,
  ) {
    track.modelUrl = modelUrl;
    track.modelScale = modelScale;
    showModel(track, modelUrl ?? DEFAULT_AIRCRAFT_MODEL_URL);
    if (!modelUrl) return;
    isModelAvailable(modelUrl).then((available) => {
      if (available || track.modelUrl !== modelUrl || viewer.isDestroyed()) {
        return;
      }
      showModel(track, DEFAULT_AIRCRAFT_MODEL_URL);
    });
  }

  function createTrack(update: AircraftUpdate): AircraftTrack {
    const position = new Cesium.SampledPositionProperty();
    position.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
    position.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;

    const orientation = new Cesium.SampledProperty(Cesium.Quaternion);
    orientation.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
    orientation.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;

    const trail = new Cesium.PolylineGlowMaterialProperty({
      glowPower: 0.2,
      color: update.id === selectedId ? selectedTrailColor : trailColor,
    });

    const entity = viewer.entities.add({
      id: update.id,
      name: update.name ?? update.id,
      position,
      orientation,
      label: {
        text: update.callsign ?? update.name ?? update.id,
        font: "12px monospace",
        showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.55),
        pixelOffset: new Cesium.Cartesian2(0, -44),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      // Travelled route: follows the sampled 3D positions, altitude included.
      path: {
        leadTime: 0,
        trailTime: 60 * 60,
        width: 6,
        material: trail,
      },
    });

    const track: AircraftTrack = {
      entity,
      position,
      orientation,
      trail,
      modelUrl: undefined,
      modelScale: undefined,
      modelSettings: DEFAULT_MODEL_SETTINGS,
      lastPoint: Cesium.Cartesian3.ZERO,
      lastHeading: 0,
      lastReport: undefined,
    };
    setTrackModel(track, update.modelUrl, update.modelScale);
    return track;
  }

  function followSelectedAircraft() {
    const track = selectedId === null ? undefined : tracks.get(selectedId);
    if (!track) {
      viewer.trackedEntity = undefined;
      return;
    }
    if (viewer.trackedEntity === track.entity) return;
    // Start the chase view behind and above the aircraft (offset is east/north/up).
    const heading = Cesium.Math.toRadians(track.lastHeading);
    track.entity.viewFrom = new Cesium.Cartesian3(
      -Math.sin(heading) * 260,
      -Math.cos(heading) * 260,
      90,
    );
    viewer.trackedEntity = track.entity;
  }

  function updateAircraft(update: AircraftUpdate) {
    const time = Cesium.JulianDate.fromDate(
      new Date(update.timestamp ?? Date.now()),
    );
    const point = Cesium.Cartesian3.fromDegrees(
      update.lng,
      update.lat,
      update.altitude * FEET_TO_METERS,
    );

    let track = tracks.get(update.id);
    const isNew = !track;
    if (!track) {
      track = createTrack(update);
      tracks.set(update.id, track);
    } else {
      // Updates may omit the model fields; only a different value changes it.
      const modelUrl = update.modelUrl ?? track.modelUrl;
      const modelScale = update.modelScale ?? track.modelScale;
      if (modelUrl !== track.modelUrl || modelScale !== track.modelScale) {
        setTrackModel(track, modelUrl, modelScale);
      }
    }

    const { headingOffset, pitchOffset, rollOffset } = track.modelSettings;
    const hpr = new Cesium.HeadingPitchRoll(
      Cesium.Math.toRadians(update.heading + headingOffset),
      Cesium.Math.toRadians((update.pitch ?? 0) + pitchOffset),
      Cesium.Math.toRadians((update.roll ?? 0) + rollOffset),
    );

    track.position.addSample(time, point);
    track.orientation.addSample(
      time,
      Cesium.Transforms.headingPitchRollQuaternion(
        point,
        hpr,
        Cesium.Ellipsoid.WGS84,
        northWestUpFrame,
      ),
    );
    track.lastPoint = point;
    track.lastHeading = update.heading;
    track.lastReport = update;

    for (const record of zoneRecords.values()) {
      if (evaluateZone(record, update.id, update)) styleZone(record);
    }

    // All aircraft share one render clock. Keep it a fixed distance behind
    // the newest sample of any aircraft. It then advances by itself in real
    // time; re-sync only if it has drifted (first update, feed stalled, tab
    // was in the background, ...).
    const isFirst = !latestTime;
    if (!latestTime || Cesium.JulianDate.greaterThan(time, latestTime)) {
      latestTime = time;
    }
    const lag = Cesium.JulianDate.secondsDifference(
      latestTime,
      clock.currentTime,
    );
    const drifted = lag < INTERPOLATION_BUFFER_S / 2 || lag > 4.5;
    if (isFirst || (clock.shouldAnimate && drifted)) {
      clock.currentTime = Cesium.JulianDate.addSeconds(
        latestTime,
        -INTERPOLATION_BUFFER_S,
        new Cesium.JulianDate(),
      );
    }

    if (isNew && update.id === selectedId && cameraMode === "follow") {
      followSelectedAircraft();
    }
  }

  function removeAircraft(id: string) {
    const track = tracks.get(id);
    if (!track) return;
    if (viewer.trackedEntity === track.entity) viewer.trackedEntity = undefined;
    // Removing the entity takes its model, label and trail with it.
    viewer.entities.remove(track.entity);
    tracks.delete(id);
    for (const record of zoneRecords.values()) {
      if (record.aircraftStates.delete(id)) styleZone(record);
    }
  }

  function setSelectedAircraft(id: string | null) {
    if (id !== selectedId) {
      const previous = selectedId === null ? undefined : tracks.get(selectedId);
      if (previous) {
        previous.trail.color = new Cesium.ConstantProperty(trailColor);
      }
      selectedId = id;
      const next = id === null ? undefined : tracks.get(id);
      if (next) {
        next.trail.color = new Cesium.ConstantProperty(selectedTrailColor);
      }
    }
    if (cameraMode === "follow") followSelectedAircraft();
  }

  // Clicking an aircraft (or its trail / label) selects it. Replaces Cesium's
  // own click-to-select and double-click-to-track, which would bypass the UI.
  viewer.screenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
  );
  viewer.screenSpaceEventHandler.setInputAction(
    (click: CesiumModule.ScreenSpaceEventHandler.PositionedEvent) => {
      // Drill through, so an aircraft inside or behind a zone volume can
      // still be clicked.
      for (const { id: picked } of scene.drillPick(click.position, 5)) {
        if (picked instanceof Cesium.Entity && tracks.has(picked.id)) {
          onSelect(picked.id);
          return;
        }
      }
    },
    Cesium.ScreenSpaceEventType.LEFT_CLICK,
  );

  function setCameraMode(mode: CameraMode) {
    cameraMode = mode;
    if (mode === "follow") followSelectedAircraft();
    else viewer.trackedEntity = undefined;
  }

  // Overview of the flight area: looking north at the centre, tilted so the
  // height of zones and the altitude of aircraft are visible.
  function resetCamera(duration = 1.5) {
    viewer.trackedEntity = undefined;
    camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(
        Cesium.Cartesian3.fromDegrees(center.lng, center.lat),
      ),
      {
        duration,
        offset: new Cesium.HeadingPitchRange(
          0,
          Cesium.Math.toRadians(OVERVIEW_PITCH_DEG),
          OVERVIEW_RANGE_M,
        ),
      },
    );
  }
  // Open on the flight area instead of the default whole-Earth view.
  resetCamera(0);

  function setPaused(paused: boolean) {
    clock.shouldAnimate = !paused;
  }

  function destroy() {
    removeLightListener();
    viewer.destroy();
  }

  return {
    updateAircraft,
    removeAircraft,
    resetCamera,
    setZones,
    setSelectedAircraft,
    setCameraMode,
    setPaused,
    destroy,
  };
}

type AircraftMapProps = {
  /** Centre of the flight area, used for the initial view and Reset. */
  center: { lat: number; lng: number };
  /** Zones to draw; pass a new array (and new objects for changed zones) to update. */
  zones: FlightZone[];
  selectedAircraftId: string | null;
  cameraMode: CameraMode;
  paused: boolean;
  /** Called when the user clicks an aircraft on the map. */
  onSelectAircraft: (id: string) => void;
  /** Called with the map API once the viewer exists, and with null on teardown. */
  onReady: (api: AircraftMapApi | null) => void;
};

export default function AircraftMap({
  center,
  zones,
  selectedAircraftId,
  cameraMode,
  paused,
  onSelectAircraft,
  onReady,
}: AircraftMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof createAircraftScene> | null>(null);
  // Latest props, for applying to a scene that finishes loading later.
  const settingsRef = useRef({
    center,
    zones,
    selectedAircraftId,
    cameraMode,
    paused,
    onSelectAircraft,
  });

  useEffect(() => {
    settingsRef.current = {
      center,
      zones,
      selectedAircraftId,
      cameraMode,
      paused,
      onSelectAircraft,
    };
    sceneRef.current?.setZones(zones);
    sceneRef.current?.setSelectedAircraft(selectedAircraftId);
    sceneRef.current?.setCameraMode(cameraMode);
    sceneRef.current?.setPaused(paused);
  }, [center, zones, selectedAircraftId, cameraMode, paused, onSelectAircraft]);

  useEffect(() => {
    let cancelled = false;

    loadCesium()
      .then((Cesium) => {
        if (cancelled || !containerRef.current) return;
        const aircraftScene = createAircraftScene(
          Cesium,
          containerRef.current,
          settingsRef.current.center,
          (id) => settingsRef.current.onSelectAircraft(id),
        );
        aircraftScene.setZones(settingsRef.current.zones);
        aircraftScene.setSelectedAircraft(
          settingsRef.current.selectedAircraftId,
        );
        aircraftScene.setCameraMode(settingsRef.current.cameraMode);
        aircraftScene.setPaused(settingsRef.current.paused);
        sceneRef.current = aircraftScene;
        onReady({
          updateAircraft: aircraftScene.updateAircraft,
          removeAircraft: aircraftScene.removeAircraft,
          resetCamera: () => aircraftScene.resetCamera(),
        });
      })
      .catch((error) => console.error(error));

    return () => {
      cancelled = true;
      if (!sceneRef.current) return;
      onReady(null);
      sceneRef.current.destroy();
      sceneRef.current = null;
    };
  }, [onReady]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
