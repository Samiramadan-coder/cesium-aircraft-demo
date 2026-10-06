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
} from "@/lib/aircraft/types";

type Cesium = typeof CesiumModule;

const CESIUM_BASE_URL = "/cesium"; // public/cesium, see scripts/copy-cesium-assets.mjs
const AIRCRAFT_MODEL_URL = "/models/aircraft.glb";

const FEET_TO_METERS = 0.3048;

// The aircraft is rendered this far behind the newest update, so there is
// always a "next" sample to interpolate toward (must exceed the update interval).
const INTERPOLATION_BUFFER_S = 1.5;

// Added to the reported heading. 0 suits models whose nose points along
// Cesium's +X axis (glTF +Z), like the Cesium Air sample. Use 90 / -90 / 180
// if your aircraft.glb appears to fly sideways or backwards.
const MODEL_HEADING_OFFSET_DEG = 0;

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
  lastPoint: CesiumModule.Cartesian3;
  lastHeading: number;
};

function createAircraftScene(
  Cesium: Cesium,
  container: HTMLDivElement,
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
      model: {
        uri: AIRCRAFT_MODEL_URL,
        // Keeps the aircraft visible from far away; true scale up close.
        minimumPixelSize: 72,
        maximumScale: 4000,
      },
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

    return {
      entity,
      position,
      orientation,
      trail,
      lastPoint: Cesium.Cartesian3.ZERO,
      lastHeading: 0,
    };
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
    const hpr = new Cesium.HeadingPitchRoll(
      Cesium.Math.toRadians(update.heading + MODEL_HEADING_OFFSET_DEG),
      Cesium.Math.toRadians(update.pitch ?? 0),
      Cesium.Math.toRadians(update.roll ?? 0),
    );

    let track = tracks.get(update.id);
    const isNew = !track;
    if (!track) {
      track = createTrack(update);
      tracks.set(update.id, track);
    }

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
      const picked = scene.pick(click.position)?.id;
      if (picked instanceof Cesium.Entity && tracks.has(picked.id)) {
        onSelect(picked.id);
      }
    },
    Cesium.ScreenSpaceEventType.LEFT_CLICK,
  );

  function setCameraMode(mode: CameraMode) {
    cameraMode = mode;
    if (mode === "follow") followSelectedAircraft();
    else viewer.trackedEntity = undefined;
  }

  function resetCamera() {
    viewer.trackedEntity = undefined;
    if (tracks.size === 0) {
      camera.flyHome(1.5);
      return;
    }
    const area = Cesium.BoundingSphere.fromPoints(
      Array.from(tracks.values(), (track) => track.lastPoint),
    );
    camera.flyToBoundingSphere(area, {
      duration: 1.5,
      offset: new Cesium.HeadingPitchRange(
        0,
        Cesium.Math.toRadians(-40),
        Math.max(area.radius * 3, 45_000),
      ),
    });
  }

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
    setSelectedAircraft,
    setCameraMode,
    setPaused,
    destroy,
  };
}

type AircraftMapProps = {
  selectedAircraftId: string | null;
  cameraMode: CameraMode;
  paused: boolean;
  /** Called when the user clicks an aircraft on the map. */
  onSelectAircraft: (id: string) => void;
  /** Called with the map API once the viewer exists, and with null on teardown. */
  onReady: (api: AircraftMapApi | null) => void;
};

export default function AircraftMap({
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
    selectedAircraftId,
    cameraMode,
    paused,
    onSelectAircraft,
  });

  useEffect(() => {
    settingsRef.current = {
      selectedAircraftId,
      cameraMode,
      paused,
      onSelectAircraft,
    };
    sceneRef.current?.setSelectedAircraft(selectedAircraftId);
    sceneRef.current?.setCameraMode(cameraMode);
    sceneRef.current?.setPaused(paused);
  }, [selectedAircraftId, cameraMode, paused, onSelectAircraft]);

  useEffect(() => {
    let cancelled = false;

    loadCesium()
      .then((Cesium) => {
        if (cancelled || !containerRef.current) return;
        const aircraftScene = createAircraftScene(
          Cesium,
          containerRef.current,
          (id) => settingsRef.current.onSelectAircraft(id),
        );
        aircraftScene.setSelectedAircraft(
          settingsRef.current.selectedAircraftId,
        );
        aircraftScene.setCameraMode(settingsRef.current.cameraMode);
        aircraftScene.setPaused(settingsRef.current.paused);
        sceneRef.current = aircraftScene;
        onReady({
          updateAircraft: aircraftScene.updateAircraft,
          removeAircraft: aircraftScene.removeAircraft,
          resetCamera: aircraftScene.resetCamera,
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
