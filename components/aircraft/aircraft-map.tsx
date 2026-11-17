"use client";

import { useEffect, useRef } from "react";
// Types only: the Cesium runtime is the prebuilt bundle served from
// public/cesium (see loadCesium), so Next.js never has to bundle it.
import type * as CesiumModule from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import type {
  AircraftMapApi,
  AircraftTrailPoint,
  AircraftUpdate,
  AirfieldLayout,
  CameraMode,
  FlightZone,
  MapMarker,
} from "@/types/aircraft";
import {
  type Cesium,
  FEET_TO_METERS,
  createViewer,
  loadCesium,
} from "@/lib/aircraft/cesium";
import { getAircraftZoneState } from "@/lib/aircraft/zones";

// Used for aircraft without a `modelUrl`, and when theirs fails to load.
const DEFAULT_AIRCRAFT_MODEL_URL = "/models/aircraft.glb";

// The aircraft is rendered this far behind the newest update, so there is
// always a "next" sample to interpolate toward (must exceed the update interval).
const INTERPOLATION_BUFFER_S = 1.5;

// Overview camera (initial view and Reset): distance from the centre of the
// flight area and downward tilt.
const OVERVIEW_RANGE_M = 20_000;
const OVERVIEW_PITCH_DEG = -35;

type ModelSettings = {
  /** Size multiplier; an aircraft's own `modelScale` takes precedence. */
  scale: number;
  /** Keeps the aircraft visible from far away; true scale up close. */
  minimumPixelSize: number;
  maximumScale: number;
  // Degrees added to the reported attitude. Model files are normalized to
  // nose along glTF +Z (which Cesium flies forward) by
  // scripts/normalize-model.mjs, so these stay 0; prefer normalizing a new
  // model over setting them.
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

// Per-model overrides of the defaults above, keyed by model URL. Normally
// empty: fix a model's size or orientation in the file with
// `npm run normalize-model` instead. Sources and licenses
// of the model files are listed in public/models/CREDITS.md.
const MODEL_SETTINGS: Record<string, Partial<ModelSettings>> = {};

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

/** A longer gap between two trail points (lost signal) breaks the line. */
const TRAIL_GAP_MS = 60_000;

/** Route color of each warning / violation status; others use the default. */
const TRAIL_STATUS_COLORS: Record<string, string> = {
  nearBoundary: "#fbbf24",
  nearCeiling: "#fbbf24",
  atzAltitudeWarning: "#fbbf24",
  ceilingExceeded: "#f87171",
  outsideZone: "#f87171",
};

/** Camera distance for flyTo, meters. */
const FLY_TO_RANGE_M = 2_500;

/** Drawn width of the runway line, pixels. */
const RUNWAY_WIDTH_PX = 8;

const feet = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function createAircraftScene(
  Cesium: Cesium,
  container: HTMLDivElement,
  center: { lat: number; lng: number },
  googleMapsApiKey: string | undefined,
  onSelect: (id: string) => void,
) {
  const viewer = createViewer(Cesium, container, googleMapsApiKey);
  const { scene, clock, camera } = viewer;

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
    const base = Cesium.Color.fromCssColorString(
      record.zone.color ?? ZONE_COLORS[type],
    );

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
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray(
            coordinates.flatMap((c) => [c.lng, c.lat]),
          ),
          zone.holes?.map(
            (hole) =>
              new Cesium.PolygonHierarchy(
                Cesium.Cartesian3.fromDegreesArray(
                  hole.flatMap((c) => [c.lng, c.lat]),
                ),
              ),
          ),
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

  // The home aerodrome: runway, circuit and reference point, draped on the
  // ground. Rebuilt when the layout changes; hidden as a whole on request.
  let airfieldEntities: CesiumModule.Entity[] = [];
  let airfieldVisible = true;

  function setAirfield(layout: AirfieldLayout | null) {
    for (const entity of airfieldEntities) viewer.entities.remove(entity);
    airfieldEntities = [];
    if (!layout) return;

    const toDegrees = (points: Array<{ lat: number; lng: number }>) =>
      Cesium.Cartesian3.fromDegreesArray(points.flatMap((p) => [p.lng, p.lat]));

    const thresholds = layout.runwayThresholds;
    if (thresholds.length >= 2) {
      airfieldEntities.push(
        viewer.entities.add({
          name: `${layout.icao} runway`,
          polyline: {
            positions: toDegrees(thresholds.map((t) => t.threshold)),
            width: RUNWAY_WIDTH_PX,
            clampToGround: true,
            material:
              Cesium.Color.fromCssColorString("#e5e7eb").withAlpha(0.85),
          },
        }),
      );
    }
    for (const { designator, threshold } of thresholds) {
      airfieldEntities.push(
        viewer.entities.add({
          name: `RWY ${designator}`,
          position: Cesium.Cartesian3.fromDegrees(threshold.lng, threshold.lat),
          label: {
            text: designator,
            font: "bold 12px monospace",
            fillColor: Cesium.Color.WHITE,
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }),
      );
    }

    if (layout.circuitPattern.length >= 2) {
      airfieldEntities.push(
        viewer.entities.add({
          name: `${layout.icao} circuit`,
          polyline: {
            positions: toDegrees(layout.circuitPattern),
            width: 2,
            clampToGround: true,
            material: new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString("#38bdf8"),
              dashLength: 16,
            }),
          },
        }),
      );
    }

    const { lat, lng } = layout.referencePoint;
    airfieldEntities.push(
      viewer.entities.add({
        name: layout.icao,
        position: Cesium.Cartesian3.fromDegrees(lng, lat),
        point: {
          pixelSize: 7,
          color: Cesium.Color.fromCssColorString("#38bdf8"),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1.5,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: layout.icao,
          font: "bold 12px sans-serif",
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }),
    );
    setAirfieldVisible(airfieldVisible);
  }

  function setAirfieldVisible(visible: boolean) {
    airfieldVisible = visible;
    for (const entity of airfieldEntities) entity.show = visible;
  }

  // Route history from the API, drawn under the live path: one polyline per
  // run of points with the same color, so warnings show up on the route.
  type TrailSegment = {
    entity: CesiumModule.Entity;
    /** Status color, or null for the default (selected / unselected) one. */
    color: string | null;
  };
  const trailSegments = new Map<string, TrailSegment[]>();
  // Trail entity -> aircraft id, so clicking a route selects its aircraft.
  const trailOwners = new Map<CesiumModule.Entity, string>();

  function trailSegmentColor(aircraftId: string, color: string | null) {
    if (color) return Cesium.Color.fromCssColorString(color);
    return aircraftId === selectedId ? selectedTrailColor : trailColor;
  }

  function clearTrail(id: string) {
    for (const { entity } of trailSegments.get(id) ?? []) {
      viewer.entities.remove(entity);
      trailOwners.delete(entity);
    }
    trailSegments.delete(id);
  }

  function setTrail(id: string, points: AircraftTrailPoint[]) {
    clearTrail(id);
    const segments: TrailSegment[] = [];
    let run: AircraftTrailPoint[] = [];
    let runColor: string | null = null;

    const flush = () => {
      if (run.length < 2) return;
      const entity = viewer.entities.add({
        polyline: {
          positions: run.map((p) =>
            Cesium.Cartesian3.fromDegrees(
              p.lng,
              p.lat,
              p.altitude * FEET_TO_METERS,
            ),
          ),
          width: 6,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.2,
            color: trailSegmentColor(id, runColor),
          }),
        },
      });
      trailOwners.set(entity, id);
      segments.push({ entity, color: runColor });
    };

    for (const point of points) {
      const color = TRAIL_STATUS_COLORS[point.status ?? ""] ?? null;
      const previous = run.at(-1);
      if (!previous || point.timestamp - previous.timestamp > TRAIL_GAP_MS) {
        flush();
        run = [point];
        runColor = color;
      } else if (color !== runColor) {
        // Start the next color where this one ends, so the line is unbroken.
        flush();
        run = [previous, point];
        runColor = color;
      } else {
        run.push(point);
      }
    }
    flush();
    trailSegments.set(id, segments);
  }

  function recolorTrail(id: string | null) {
    if (id === null) return;
    for (const { entity, color } of trailSegments.get(id) ?? []) {
      entity.polyline!.material = new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.2,
        color: trailSegmentColor(id, color),
      });
    }
  }

  let markerEntities: CesiumModule.Entity[] = [];

  function setMarkers(markers: MapMarker[]) {
    for (const entity of markerEntities) viewer.entities.remove(entity);
    markerEntities = markers.map((marker) =>
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(
          marker.lng,
          marker.lat,
          marker.altitude * FEET_TO_METERS,
        ),
        point: {
          pixelSize: 9,
          color: Cesium.Color.fromCssColorString(marker.color),
          outlineColor: Cesium.Color.BLACK.withAlpha(0.7),
          outlineWidth: 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: marker.label,
          font: "11px sans-serif",
          fillColor: Cesium.Color.WHITE,
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          // Labels only up close, so they don't clutter the overview.
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
            0,
            15_000,
          ),
        },
      }),
    );
  }

  function flyTo(point: { lat: number; lng: number; altitude: number }) {
    viewer.trackedEntity = undefined;
    camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(
        Cesium.Cartesian3.fromDegrees(
          point.lng,
          point.lat,
          point.altitude * FEET_TO_METERS,
        ),
      ),
      {
        duration: 1.2,
        offset: new Cesium.HeadingPitchRange(
          camera.heading,
          Cesium.Math.toRadians(OVERVIEW_PITCH_DEG),
          FLY_TO_RANGE_M,
        ),
      },
    );
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
    clearTrail(id);
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
      const previousId = selectedId;
      selectedId = id;
      const next = id === null ? undefined : tracks.get(id);
      if (next) {
        next.trail.color = new Cesium.ConstantProperty(selectedTrailColor);
      }
      recolorTrail(previousId);
      recolorTrail(id);
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
        if (!(picked instanceof Cesium.Entity)) continue;
        const id = tracks.has(picked.id) ? picked.id : trailOwners.get(picked);
        if (id) {
          onSelect(id);
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
    setAirfield,
    setAirfieldVisible,
    setTrail,
    setMarkers,
    flyTo,
    setSelectedAircraft,
    setCameraMode,
    setPaused,
    destroy,
  };
}

type AircraftMapProps = {
  /** Centre of the flight area, used for the initial view and Reset. */
  center: { lat: number; lng: number };
  /**
   * Google Maps API key (Map Tiles API) for Google Photorealistic 3D Tiles.
   * Can differ per customer, so each one is billed on their own key. Without
   * it the map falls back to Cesium ion. Read once, when the map is created.
   */
  googleMapsApiKey?: string;
  /** Zones to draw; pass a new array (and new objects for changed zones) to update. */
  zones: FlightZone[];
  /** Home aerodrome to draw; null draws none. */
  airfield: AirfieldLayout | null;
  showAirfield: boolean;
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
  googleMapsApiKey,
  zones,
  airfield,
  showAirfield,
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
    googleMapsApiKey,
    zones,
    airfield,
    showAirfield,
    selectedAircraftId,
    cameraMode,
    paused,
    onSelectAircraft,
  });

  useEffect(() => {
    settingsRef.current = {
      center,
      googleMapsApiKey,
      zones,
      airfield,
      showAirfield,
      selectedAircraftId,
      cameraMode,
      paused,
      onSelectAircraft,
    };
    sceneRef.current?.setZones(zones);
    sceneRef.current?.setAirfieldVisible(showAirfield);
    sceneRef.current?.setSelectedAircraft(selectedAircraftId);
    sceneRef.current?.setCameraMode(cameraMode);
    sceneRef.current?.setPaused(paused);
  }, [
    center,
    googleMapsApiKey,
    zones,
    airfield,
    showAirfield,
    selectedAircraftId,
    cameraMode,
    paused,
    onSelectAircraft,
  ]);

  // Separate so toggling the layer doesn't rebuild it.
  useEffect(() => {
    sceneRef.current?.setAirfield(airfield);
  }, [airfield]);

  useEffect(() => {
    let cancelled = false;

    loadCesium()
      .then((Cesium) => {
        if (cancelled || !containerRef.current) return;
        const aircraftScene = createAircraftScene(
          Cesium,
          containerRef.current,
          settingsRef.current.center,
          settingsRef.current.googleMapsApiKey,
          (id) => settingsRef.current.onSelectAircraft(id),
        );
        aircraftScene.setZones(settingsRef.current.zones);
        aircraftScene.setAirfield(settingsRef.current.airfield);
        aircraftScene.setAirfieldVisible(settingsRef.current.showAirfield);
        aircraftScene.setSelectedAircraft(
          settingsRef.current.selectedAircraftId,
        );
        aircraftScene.setCameraMode(settingsRef.current.cameraMode);
        aircraftScene.setPaused(settingsRef.current.paused);
        sceneRef.current = aircraftScene;
        onReady({
          updateAircraft: aircraftScene.updateAircraft,
          removeAircraft: aircraftScene.removeAircraft,
          setTrail: aircraftScene.setTrail,
          setMarkers: aircraftScene.setMarkers,
          flyTo: aircraftScene.flyTo,
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
