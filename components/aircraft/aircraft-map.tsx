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
  CameraNudge,
  FlightZone,
  MapMarker,
} from "@/types/aircraft";
import {
  type Cesium,
  FEET_TO_METERS,
  createViewer,
  loadCesium,
} from "@/lib/aircraft/cesium";
import { groundedModelUrl } from "@/lib/aircraft/glb-ground";
import { createTextImage } from "@/lib/aircraft/text-image";
import { getAircraftZoneState } from "@/lib/aircraft/zones";

// Used for aircraft without a `modelUrl`, and when theirs fails to load.
const DEFAULT_AIRCRAFT_MODEL_URL = "/models/aircraft.glb";

// Smooth playback: each aircraft is drawn a little in the past, so there is
// always a "next" position to move toward instead of stopping and jumping.
// How far back is learned per aircraft from how late its positions arrive
// (tracker interval + polling + network), within these bounds, seconds.
const MIN_DELAY_S = 1;
const INITIAL_DELAY_S = 4;
const MAX_DELAY_S = 30;
/** Added to the measured need, seconds. */
const DELAY_MARGIN_S = 1.5;
/** Share of the gap closed per position when the feed gets faster. */
const DELAY_DECAY = 0.05;
/** How fast the delay may change: playback runs at 1 ± this rate. */
const DELAY_RATE = 0.3;
/** Positions further apart than this are not interpolated (signal lost). */
const MAX_GAP_S = 120;

/** Below this ground speed the reported heading is noise; keep the last one. */
const MIN_HEADING_SPEED_KT = 3;
const MAX_PITCH_DEG = 20;
const MAX_ROLL_DEG = 40;
const KNOTS_TO_MPS = 0.514444;
const FPM_TO_MPS = 0.00508;
const GRAVITY = 9.81;

/** Aircraft this close to the aerodrome never go below its surface. */
const AERODROME_RADIUS_M = 5_000;
/** Lifts the model so its wheels sit on the runway. */
const GROUND_CLEARANCE_M = 0.8;
/** Markers estimated lower than this above the surface are put on it:
 * GPS height near the ground is meters off. */
const MARKER_GROUND_SNAP_M = 15;
/** Give up measuring the ground (tiles still loading) after this long. */
const GROUND_SAMPLE_TIMEOUT_MS = 10_000;

// Overview camera (initial view and Reset): distance from the centre of the
// flight area and downward tilt.
const OVERVIEW_RANGE_M = 20_000;
const OVERVIEW_PITCH_DEG = -35;

// Follow camera: behind the aircraft, turning with it. Zoom and tilt are the
// user's (mouse wheel / drag) and are kept while following.
const CHASE_RANGE_M = 120;
const CHASE_PITCH_DEG = -15;
const CHASE_MIN_RANGE_M = 20;
const CHASE_MAX_RANGE_M = 5_000;
/** Seconds for the camera to swing most of the way round after a turn. */
const CHASE_TURN_TIME_S = 1.2;

// On-map zoom / rotate buttons: one press zooms by this factor or turns the
// view by this angle, eased over a few frames instead of jumping.
const ZOOM_STEP_FACTOR = 2;
const ROTATE_STEP_DEG = 15;
/** Seconds for a press to play out most of the way. */
const NUDGE_EASE_TIME_S = 0.12;
/** The free camera stops zooming in this close to what it looks at. */
const MIN_ZOOM_DISTANCE_M = 30;
const MAX_ZOOM_DISTANCE_M = 2_000_000;

// Real sunlight and shadows by day; at night the scene is lit from the
// camera instead, so the aircraft stays visible.
const DAYLIGHT_MIN_SUN_ELEVATION_DEG = 4;
const LIGHTING_CHECK_INTERVAL_S = 60;
/** Shadows are drawn up to this far from the camera, meters. */
const SHADOW_DISTANCE_M = 2_000;

/** Propeller turn rate while the engine runs, radians per second. Slower
 * than real (which would strobe at 60 fps), but reads as spinning. */
const PROPELLER_RAD_PER_S = 14;
/** Node every bundled model has; its local X axis is the propeller shaft. */
const PROPELLER_NODE = "propeller";

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

type AircraftTrack = {
  entity: CesiumModule.Entity;
  /** Draws the flown route; separate so it can end where the model is. */
  pathEntity: CesiumModule.Entity;
  /** Reported positions and attitudes, at their own timestamps. */
  position: CesiumModule.SampledPositionProperty;
  orientation: CesiumModule.SampledProperty;
  /** 1 while reported on the ground, 0 in the air. */
  ground: CesiumModule.SampledProperty;
  /** 1 while the engine runs, 0 when it is off. */
  engine: CesiumModule.SampledProperty;
  trail: CesiumModule.PolylineGlowMaterialProperty;
  /** Seconds this aircraft is drawn behind the clock, and where it is heading. */
  delay: number;
  targetDelay: number;
  /** Time of the newest sample, Unix ms. */
  lastTime: number;
  /** First and newest sample; playback never leaves this range. */
  firstSample: CesiumModule.JulianDate;
  lastSample: CesiumModule.JulianDate;
  lastRoll: number;
  /**
   * Start of the flight in progress: the drawn path begins there. null when
   * not flying (no path), undefined when unknown (the last hour).
   */
  flightStart: CesiumModule.JulianDate | null | undefined;
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

  // At night the scene is lit from the camera so the aircraft is never in
  // the dark; by day the real sun lights it and it casts a shadow (below).
  const light = new Cesium.DirectionalLight({ direction: camera.directionWC });
  scene.light = light;
  const sunLight = new Cesium.SunLight();
  scene.shadowMap.maximumDistance = SHADOW_DISTANCE_M;
  scene.shadowMap.softShadows = true;
  scene.shadowMap.darkness = 0.45;
  scene.shadowMap.size = 2048;

  const flightAreaUp = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(
    Cesium.Cartesian3.fromDegrees(center.lng, center.lat),
  );
  /** How high the sun stands over the flight area at `time`, degrees. */
  function sunElevation(time: CesiumModule.JulianDate) {
    const toFixed =
      Cesium.Transforms.computeIcrfToFixedMatrix(time) ??
      Cesium.Transforms.computeTemeToPseudoFixedMatrix(time);
    const sun = Cesium.Matrix3.multiplyByVector(
      toFixed,
      Cesium.Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(
        time,
      ),
      new Cesium.Cartesian3(),
    );
    Cesium.Cartesian3.normalize(sun, sun);
    return Cesium.Math.toDegrees(
      Math.asin(Cesium.Cartesian3.dot(sun, flightAreaUp)),
    );
  }

  let lightingCheckedAt: CesiumModule.JulianDate | undefined;
  const removeLightingListener = scene.preRender.addEventListener(() => {
    const time = clock.currentTime;
    if (
      lightingCheckedAt &&
      Math.abs(Cesium.JulianDate.secondsDifference(time, lightingCheckedAt)) <
        LIGHTING_CHECK_INTERVAL_S
    ) {
      return;
    }
    lightingCheckedAt = Cesium.JulianDate.clone(time);
    const daylight = sunElevation(time) > DAYLIGHT_MIN_SUN_ELEVATION_DEG;
    scene.light = daylight ? sunLight : light;
    viewer.shadows = daylight;
  });
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

  // --- Time -------------------------------------------------------------
  // The clock shows real time, corrected for this computer's clock being off
  // from the backend's. Each aircraft is drawn `track.delay` seconds behind it.
  let clockOffsetMs = 0;
  let paused = false;
  const nowMs = () => Date.now() + clockOffsetMs;
  clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
  clock.multiplier = 1;
  clock.currentTime = Cesium.JulianDate.fromDate(new Date(nowMs()));

  let lastFrame = performance.now();
  const removeTimeListener = scene.postRender.addEventListener(() => {
    const frame = performance.now();
    const dt = Math.min((frame - lastFrame) / 1000, 1);
    lastFrame = frame;
    if (paused) return;

    // Keep the clock on real time (it drifts, or jumps after a pause).
    const now = Cesium.JulianDate.fromDate(new Date(nowMs()));
    if (
      Math.abs(Cesium.JulianDate.secondsDifference(now, clock.currentTime)) >
      0.25
    ) {
      clock.currentTime = now;
    }
    // Ease each aircraft's delay toward what its feed needs, by speeding up
    // or slowing down its playback a little instead of jumping.
    const step = DELAY_RATE * dt;
    for (const track of tracks.values()) {
      track.delay += Cesium.Math.clamp(
        track.targetDelay - track.delay,
        -step,
        step,
      );
    }
  });

  /** The moment an aircraft is drawn at, for clock time `time`. */
  const shiftedTime = new Cesium.JulianDate();
  // Kept within the samples: with velocities attached, Cesium's HOLD
  // extrapolation returns a wrong position (off by meters, sometimes far
  // more), so the newest sample is held here instead.
  function playbackTime(track: AircraftTrack, time: CesiumModule.JulianDate) {
    const shifted = Cesium.JulianDate.addSeconds(
      time,
      -track.delay,
      shiftedTime,
    );
    if (Cesium.JulianDate.greaterThan(shifted, track.lastSample)) {
      return track.lastSample;
    }
    if (Cesium.JulianDate.lessThan(shifted, track.firstSample)) {
      return track.firstSample;
    }
    return shifted;
  }

  // --- Height ------------------------------------------------------------
  // Tracker altitudes are above mean sea level; Cesium heights are above the
  // WGS84 ellipsoid. The difference (geoid height, about -30 m in the UAE) is
  // measured at the aerodrome: map ground height minus published elevation.
  let seaLevelOffsetM = 0;
  let aerodrome: { center: CesiumModule.Cartesian3; groundM: number } | null =
    null;
  const surfaceScratch = new Cesium.Cartesian3();

  /** Cesium height (meters) for a reported altitude (feet AMSL). */
  function toHeight(
    lat: number,
    lng: number,
    altitudeFt: number,
    onGround = false,
  ) {
    const height = altitudeFt * FEET_TO_METERS + seaLevelOffsetM;
    if (!aerodrome) return height;
    const surface = Cesium.Cartesian3.fromDegrees(
      lng,
      lat,
      0,
      undefined,
      surfaceScratch,
    );
    if (
      Cesium.Cartesian3.distance(surface, aerodrome.center) > AERODROME_RADIUS_M
    ) {
      return height;
    }
    // GPS altitude is a few meters off: keep aircraft on, not under, the
    // runway, and put those reported on the ground exactly on it.
    const ground = aerodrome.groundM + GROUND_CLEARANCE_M;
    return onGround ? ground : Math.max(height, ground);
  }

  /**
   * Height (meters above the ellipsoid) of the ground or whatever stands on
   * it in the 3D world, at its most detailed; undefined if not loaded yet.
   * Our own drawings (zones, aircraft, routes) are not measured.
   */
  async function sampleGround(lat: number, lng: number) {
    const point = Cesium.Cartographic.fromDegrees(lng, lat);
    try {
      if (!scene.globe.show) {
        // Google 3D Tiles: terrain is part of the tileset.
        const [sampled] = await scene.sampleHeightMostDetailed(
          [point],
          viewer.entities.values,
        );
        return sampled?.height;
      }
      if (viewer.terrainProvider instanceof Cesium.EllipsoidTerrainProvider) {
        return undefined; // World Terrain still loading
      }
      const [sampled] = await Cesium.sampleTerrainMostDetailed(
        viewer.terrainProvider,
        [point],
      );
      return sampled.height;
    } catch {
      return undefined;
    }
  }

  /** Measures the ground at the aerodrome; resolves when done or given up. */
  async function measureGround(layout: AirfieldLayout | null) {
    if (!layout) return;
    const { lat, lng } = layout.referencePoint;
    // The 3D world is a meter or several off from point to point (here 238 m
    // at the reference point, 242 m at the runway ends), so the middle value
    // of several points is used.
    const points = [
      layout.referencePoint,
      ...layout.runwayThresholds.map((t) => t.threshold),
    ];
    const deadline = Date.now() + GROUND_SAMPLE_TIMEOUT_MS;
    while (Date.now() < deadline && !viewer.isDestroyed()) {
      const heights = (
        await Promise.all(points.map((p) => sampleGround(p.lat, p.lng)))
      )
        .filter((h): h is number => h !== undefined && Number.isFinite(h))
        .sort((a, b) => a - b);
      const ground = heights[Math.floor(heights.length / 2)];
      const offset = (ground ?? NaN) - layout.elevationFt * FEET_TO_METERS;
      // The geoid is within ±110 m of the ellipsoid; anything else is a miss.
      if (Number.isFinite(offset) && Math.abs(offset) < 110) {
        seaLevelOffsetM = offset;
        aerodrome = {
          center: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
          groundM: ground,
        };
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    console.warn(
      "Could not measure the aerodrome ground; altitudes are not corrected.",
    );
  }

  /**
   * Moves a position reported on the ground onto the surface actually under
   * it, once measured, so its label, route and the follow camera are there
   * too (the model itself is clamped by Cesium either way).
   */
  function settleOnGround(
    track: AircraftTrack,
    time: CesiumModule.JulianDate,
    lat: number,
    lng: number,
    velocity: CesiumModule.Cartesian3,
  ) {
    sampleGround(lat, lng).then((height) => {
      if (height === undefined || viewer.isDestroyed()) return;
      // Dropped meanwhile (signal gap reset) or not this track any more.
      if (tracks.get(track.entity.id) !== track) return;
      if (Cesium.JulianDate.lessThan(time, track.firstSample)) return;
      const point = Cesium.Cartesian3.fromDegrees(lng, lat, height);
      track.position.addSample(time, point, [velocity]);
      if (Cesium.JulianDate.equals(time, track.lastSample)) {
        track.lastPoint = point;
      }
    });
  }

  const selectedTrailColor = Cesium.Color.fromCssColorString("#38bdf8");
  const trailColor = Cesium.Color.WHITE.withAlpha(0.45);

  // aircraft id -> everything the scene keeps for that aircraft. Each one
  // owns its entity, samples and trail, so they animate independently.
  const tracks = new Map<string, AircraftTrack>();
  let selectedId: string | null = null;
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
      maxAltitude * FEET_TO_METERS + seaLevelOffsetM,
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
        // Zone altitudes are in feet AMSL; Cesium heights are in meters
        // above the ellipsoid.
        height: minAltitude * FEET_TO_METERS + seaLevelOffsetM,
        extrudedHeight: maxAltitude * FEET_TO_METERS + seaLevelOffsetM,
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
    let runOnGround = false;

    const flush = () => {
      if (run.length < 2) return;
      const entity = viewer.entities.add({
        polyline: {
          positions: run.map((p) =>
            Cesium.Cartesian3.fromDegrees(
              p.lng,
              p.lat,
              toHeight(p.lat, p.lng, p.altitude, p.status === "onGround"),
            ),
          ),
          width: 6,
          // Taxiing: drawn on the actual surface (runway, apron) rather than
          // at GPS height, which is meters off near the ground.
          clampToGround: runOnGround,
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
      const onGround = point.status === "onGround";
      const previous = run.at(-1);
      if (!previous || point.timestamp - previous.timestamp > TRAIL_GAP_MS) {
        flush();
        run = [point];
        runColor = color;
        runOnGround = onGround;
      } else if (color !== runColor || onGround !== runOnGround) {
        // Start the next part where this one ends, so the line is unbroken.
        flush();
        run = [previous, point];
        runColor = color;
        runOnGround = onGround;
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
    markerEntities = markers.map((marker) => {
      // Drawn by the browser, not a Cesium label, so Arabic reads right.
      const text = createTextImage(marker.label);
      return viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(
          marker.lng,
          marker.lat,
          toHeight(marker.lat, marker.lng, marker.altitude),
        ),
        point: {
          pixelSize: 9,
          color: Cesium.Color.fromCssColorString(marker.color),
          outlineColor: Cesium.Color.BLACK.withAlpha(0.7),
          outlineWidth: 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        billboard: {
          image: text.canvas,
          width: text.width,
          height: text.height,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          // Labels only up close, so they don't clutter the overview.
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
            0,
            15_000,
          ),
        },
      });
    });

    // Events on or near the ground (takeoff, landing, signal lost while
    // parked...) go on the surface actually there, next to the aircraft,
    // instead of under or above it.
    const entities = markerEntities;
    markers.forEach((marker, index) => {
      const estimate = toHeight(marker.lat, marker.lng, marker.altitude);
      sampleGround(marker.lat, marker.lng).then((ground) => {
        // Replaced meanwhile, or clearly in the air.
        if (ground === undefined || markerEntities !== entities) return;
        if (estimate - ground > MARKER_GROUND_SNAP_M) return;
        entities[index].position = new Cesium.ConstantPositionProperty(
          Cesium.Cartesian3.fromDegrees(marker.lng, marker.lat, ground),
        );
      });
    });
  }

  function flyTo(point: { lat: number; lng: number; altitude: number }) {
    cameraMode = "free";
    releaseChase();
    camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(
        Cesium.Cartesian3.fromDegrees(
          point.lng,
          point.lat,
          toHeight(point.lat, point.lng, point.altitude),
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

  /** `uri` may be a blob URL of `modelUrl`, which keys MODEL_SETTINGS. */
  function showModel(track: AircraftTrack, uri: string, modelUrl = uri) {
    const settings = { ...DEFAULT_MODEL_SETTINGS, ...MODEL_SETTINGS[modelUrl] };
    track.modelSettings = settings;
    track.entity.model = new Cesium.ModelGraphics({
      uri,
      scale: track.modelScale ?? settings.scale,
      minimumPixelSize: settings.minimumPixelSize,
      maximumScale: settings.maximumScale,
      heightReference: groundReference(track),
      shadows: Cesium.ShadowMode.ENABLED,
      nodeTransformations: new Cesium.PropertyBag({
        [PROPELLER_NODE]: new Cesium.NodeTransformationProperty({
          rotation: new Cesium.CallbackProperty(
            (time) => propellerRotation(track, time!),
            false,
          ),
        }),
      }),
    });
  }

  const propellerScratch = new Cesium.Quaternion();
  /** Turns the propeller while the engine runs (stops with the clock). */
  function propellerRotation(
    track: AircraftTrack,
    time: CesiumModule.JulianDate,
  ) {
    if ((track.engine.getValue(playbackTime(track, time)) ?? 0) < 0.5) {
      return Cesium.Quaternion.IDENTITY;
    }
    const angle =
      (time.secondsOfDay * PROPELLER_RAD_PER_S) % Cesium.Math.TWO_PI;
    return Cesium.Quaternion.fromAxisAngle(
      Cesium.Cartesian3.UNIT_X,
      angle,
      propellerScratch,
    );
  }

  // On the ground, Cesium puts the model on the actual surface under it
  // (terrain or 3D tiles, at their current detail). The height measured at
  // the aerodrome reference point can be a meter or two off elsewhere on the
  // field, which buried the aircraft once the tiles got detailed up close.
  function groundReference(track: AircraftTrack) {
    return new Cesium.CallbackProperty(
      (time) =>
        (track.ground.getValue(playbackTime(track, time!)) ?? 0) >= 0.5
          ? Cesium.HeightReference.CLAMP_TO_GROUND
          : Cesium.HeightReference.NONE,
      false,
    );
  }

  // Gives one aircraft its model. Aircraft may share a model or each have
  // their own; a model that cannot be loaded is replaced by the default one.
  // Any model (e.g. uploaded) is first lifted so its wheels are on its
  // origin, which Cesium puts on the runway; see lib/aircraft/glb-ground.ts.
  function setTrackModel(
    track: AircraftTrack,
    modelUrl: string | undefined,
    modelScale: number | undefined,
  ) {
    track.modelUrl = modelUrl;
    track.modelScale = modelScale;
    if (!modelUrl) {
      showModel(track, DEFAULT_AIRCRAFT_MODEL_URL);
      return;
    }
    // A new aircraft shows the default model until its own is ready.
    if (!track.entity.model) showModel(track, DEFAULT_AIRCRAFT_MODEL_URL);
    groundedModelUrl(modelUrl).then((uri) => {
      if (
        viewer.isDestroyed() ||
        track.modelUrl !== modelUrl ||
        track.modelScale !== modelScale
      ) {
        return;
      }
      if (uri) showModel(track, uri, modelUrl);
      else showModel(track, DEFAULT_AIRCRAFT_MODEL_URL);
    });
  }

  function createTrack(update: AircraftUpdate): AircraftTrack {
    // Each position carries its velocity (from speed, heading and climb
    // rate), so the aircraft follows smooth curves between positions
    // (cubic Hermite) instead of turning sharply at each one.
    const position = new Cesium.SampledPositionProperty(undefined, 1);
    position.setInterpolationOptions({
      interpolationAlgorithm: Cesium.HermitePolynomialApproximation,
      interpolationDegree: 3,
    });
    position.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
    position.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;

    const orientation = new Cesium.SampledProperty(Cesium.Quaternion);
    orientation.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
    orientation.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;

    const ground = new Cesium.SampledProperty(Number);
    ground.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
    ground.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;

    const engine = new Cesium.SampledProperty(Number);
    engine.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
    engine.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;

    const trail = new Cesium.PolylineGlowMaterialProperty({
      glowPower: 0.2,
      color: update.id === selectedId ? selectedTrailColor : trailColor,
    });

    const entity = viewer.entities.add({
      id: update.id,
      name: update.name ?? update.id,
      // The samples, played back `track.delay` seconds late.
      position: new Cesium.CallbackPositionProperty(
        (time, result) => position.getValue(playbackTime(track, time!), result),
        false,
      ),
      orientation: new Cesium.CallbackProperty(
        (time, result) =>
          orientation.getValue(playbackTime(track, time!), result),
        false,
      ),
      label: {
        text: update.callsign ?? update.name ?? update.id,
        font: "12px monospace",
        showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.55),
        pixelOffset: new Cesium.Cartesian2(0, -44),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    // Travelled route, 3D, drawn from the samples up to where the model is.
    const pathEntity = viewer.entities.add({
      position,
      path: {
        // Ends where the model is, and never past the newest sample (see
        // playbackTime).
        leadTime: new Cesium.CallbackProperty(
          (time) =>
            Math.min(
              -track.delay,
              Cesium.JulianDate.secondsDifference(track.lastSample, time!),
            ),
          false,
        ),
        // Only the flight in progress; nothing once it has ended.
        show: new Cesium.CallbackProperty(
          () => track.flightStart !== null,
          false,
        ),
        trailTime: new Cesium.CallbackProperty(
          (time) =>
            track.flightStart
              ? Math.max(
                  0,
                  Cesium.JulianDate.secondsDifference(time!, track.flightStart),
                )
              : 60 * 60,
          false,
        ),
        width: 6,
        resolution: 1,
        material: trail,
      },
    });
    trailOwners.set(pathEntity, update.id);

    const track: AircraftTrack = {
      entity,
      pathEntity,
      position,
      orientation,
      ground,
      engine,
      trail,
      delay: INITIAL_DELAY_S,
      targetDelay: INITIAL_DELAY_S,
      lastTime: -Infinity,
      firstSample: new Cesium.JulianDate(),
      lastSample: new Cesium.JulianDate(),
      lastRoll: 0,
      flightStart: undefined,
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

  // Follow camera: each frame, look at the selected aircraft from behind,
  // easing round after its turns instead of snapping to every heading.
  const chase = {
    range: CHASE_RANGE_M,
    pitch: Cesium.Math.toRadians(CHASE_PITCH_DEG),
    /** The aircraft's heading, eased so the camera swings smoothly. */
    heading: undefined as number | undefined,
    /** How far the user has turned the camera round the aircraft. */
    orbit: 0,
    /** Camera heading set last frame, to see how much the user turned it. */
    applied: 0,
    /** True once the camera is locked onto the aircraft. */
    locked: false,
  };
  const chaseTarget = new Cesium.Cartesian3();
  const chaseEnu = new Cesium.Matrix4();
  const chaseLocal = new Cesium.Cartesian3();
  const chaseTime = new Cesium.JulianDate();

  // Zoom / rotate still to play from the on-map buttons: zoom in steps
  // (+ = closer), rotation in radians (+ = view turns right).
  const nudge = { zoom: 0, rotate: 0 };
  const nudgePivot = new Cesium.Cartesian3();
  const nudgeEnu = new Cesium.Matrix4();
  const screenCenter = new Cesium.Cartesian2();

  /** Queues a zoom (+ in, - out) and/or turn (+ right, - left) in steps. */
  function nudgeCamera({ zoom = 0, rotate = 0 }: CameraNudge) {
    nudge.zoom += zoom;
    nudge.rotate += Cesium.Math.toRadians(rotate * ROTATE_STEP_DEG);
  }

  /** The part of the queued zoom / rotation to apply this frame. */
  function takeNudge(dt: number) {
    if (nudge.zoom === 0 && nudge.rotate === 0) return undefined;
    const ease = 1 - Math.exp(-dt / NUDGE_EASE_TIME_S);
    const step = { zoom: nudge.zoom * ease, rotate: nudge.rotate * ease };
    nudge.zoom -= step.zoom;
    nudge.rotate -= step.rotate;
    // Close enough: finish instead of creeping forever.
    if (Math.abs(nudge.zoom) < 1e-3 && Math.abs(nudge.rotate) < 1e-4) {
      step.zoom += nudge.zoom;
      step.rotate += nudge.rotate;
      nudge.zoom = 0;
      nudge.rotate = 0;
    }
    return step;
  }

  /** Range factor for a zoom of `steps` (> 1 = closer). */
  function zoomFactor(steps: number) {
    return ZOOM_STEP_FACTOR ** steps;
  }

  /** What the free camera looks at: the scene at the centre of the view. */
  function viewPivot() {
    const canvas = scene.canvas;
    screenCenter.x = canvas.clientWidth / 2;
    screenCenter.y = canvas.clientHeight / 2;
    if (scene.pickPositionSupported) {
      const picked = scene.pickPosition(screenCenter, nudgePivot);
      if (picked) return picked;
    }
    const onEllipsoid = camera.pickEllipsoid(
      screenCenter,
      scene.globe.ellipsoid,
      nudgePivot,
    );
    if (onEllipsoid) return onEllipsoid;
    // Looking at the sky: turn and zoom about a point ahead.
    return Cesium.Cartesian3.add(
      camera.positionWC,
      Cesium.Cartesian3.multiplyByScalar(
        camera.directionWC,
        Math.max(camera.positionCartographic.height, 1_000),
        nudgePivot,
      ),
      nudgePivot,
    );
  }

  /** Free camera: turn round, and move toward, what is in the middle. */
  function applyFreeNudge(step: { zoom: number; rotate: number }) {
    const pivot = viewPivot();
    if (step.rotate !== 0) {
      // Orbit the pivot about its vertical, so the view turns in place.
      Cesium.Transforms.eastNorthUpToFixedFrame(pivot, undefined, nudgeEnu);
      camera.lookAtTransform(nudgeEnu);
      camera.rotateLeft(step.rotate);
      camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }
    if (step.zoom !== 0) {
      const distance = Cesium.Cartesian3.distance(camera.positionWC, pivot);
      const target = Cesium.Math.clamp(
        distance / zoomFactor(step.zoom),
        MIN_ZOOM_DISTANCE_M,
        MAX_ZOOM_DISTANCE_M,
      );
      camera.moveForward(distance - target);
    }
  }

  /** Where an aircraft is drawn `offsetS` seconds from `time`. */
  function positionAround(
    track: AircraftTrack,
    time: CesiumModule.JulianDate,
    offsetS: number,
    result: CesiumModule.Cartesian3,
  ) {
    Cesium.JulianDate.addSeconds(time, offsetS, chaseTime);
    return track.position.getValue(playbackTime(track, chaseTime), result);
  }

  /** Direction the aircraft moves at `time`, radians clockwise from north. */
  function movingHeading(track: AircraftTrack, time: CesiumModule.JulianDate) {
    const before = positionAround(track, time, -1.5, new Cesium.Cartesian3());
    const after = positionAround(track, time, 1.5, new Cesium.Cartesian3());
    if (!before || !after || Cesium.Cartesian3.distance(before, after) < 1) {
      return undefined; // Standing still: keep the current heading.
    }
    Cesium.Transforms.eastNorthUpToFixedFrame(before, undefined, chaseEnu);
    Cesium.Matrix4.inverseTransformation(chaseEnu, chaseEnu);
    const local = Cesium.Matrix4.multiplyByPoint(chaseEnu, after, chaseLocal);
    return Math.atan2(local.x, local.y);
  }

  let lastChaseFrame = performance.now();
  const removeChaseListener = scene.preUpdate.addEventListener(() => {
    const frame = performance.now();
    const dt = Math.min((frame - lastChaseFrame) / 1000, 1);
    lastChaseFrame = frame;
    const step = takeNudge(dt);
    if (cameraMode !== "follow") {
      if (step) applyFreeNudge(step);
      return;
    }
    const track = selectedId === null ? undefined : tracks.get(selectedId);
    const target = track?.entity.position?.getValue(
      clock.currentTime,
      chaseTarget,
    );
    if (!track || !target) return;

    if (chase.locked) {
      // Keep what the user did with the mouse since the last frame.
      chase.range = Cesium.Math.clamp(
        Cesium.Cartesian3.magnitude(camera.position),
        CHASE_MIN_RANGE_M,
        CHASE_MAX_RANGE_M,
      );
      chase.pitch = Cesium.Math.clamp(
        camera.pitch,
        Cesium.Math.toRadians(-85),
        Cesium.Math.toRadians(-3),
      );
      // Dragging left / right turns the camera round the aircraft; keep
      // that angle while following.
      chase.orbit = Cesium.Math.negativePiToPi(
        chase.orbit +
          Cesium.Math.negativePiToPi(camera.heading - chase.applied),
      );
    }

    if (step) {
      // The buttons zoom and turn round the aircraft, like the mouse.
      chase.range = Cesium.Math.clamp(
        chase.range / zoomFactor(step.zoom),
        CHASE_MIN_RANGE_M,
        CHASE_MAX_RANGE_M,
      );
      chase.orbit = Cesium.Math.negativePiToPi(chase.orbit + step.rotate);
    }

    chase.heading ??= Cesium.Math.toRadians(track.lastHeading);
    const heading = movingHeading(track, clock.currentTime);
    if (heading !== undefined) {
      const ease = 1 - Math.exp(-dt / CHASE_TURN_TIME_S);
      chase.heading +=
        Cesium.Math.negativePiToPi(heading - chase.heading) * ease;
    }

    chase.applied = chase.heading + chase.orbit;
    camera.lookAt(
      target,
      new Cesium.HeadingPitchRange(chase.applied, chase.pitch, chase.range),
    );
    chase.locked = true;
  });

  /** Lets the camera move freely again. */
  function releaseChase() {
    if (chase.locked) camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    chase.locked = false;
    chase.heading = undefined;
    chase.orbit = 0;
  }

  function followSelectedAircraft() {
    // The preUpdate listener takes over; start behind the new aircraft.
    chase.heading = undefined;
    chase.orbit = 0;
  }

  function updateAircraft(update: AircraftUpdate) {
    const timeMs = update.timestamp ?? nowMs();
    const time = Cesium.JulianDate.fromDate(new Date(timeMs));
    const onGround = update.onGround ?? false;
    const point = Cesium.Cartesian3.fromDegrees(
      update.lng,
      update.lat,
      toHeight(update.lat, update.lng, update.altitude, onGround),
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

    // Repeated or out-of-order positions (polling returns the same one
    // until the tracker reports again) change nothing.
    if (timeMs <= track.lastTime) return;
    const dt = (timeMs - track.lastTime) / 1000;
    const continues = dt <= MAX_GAP_S;

    if (!continues && !isNew) {
      // Signal was lost for a while: start over at the new position rather
      // than sliding across the gap.
      const before = new Cesium.TimeInterval({
        start: Cesium.JulianDate.fromDate(new Date(0)),
        stop: time,
        isStopIncluded: false,
      });
      track.position.removeSamples(before);
      track.orientation.removeSamples(before);
      track.ground.removeSamples(before);
      track.engine.removeSamples(before);
      Cesium.JulianDate.clone(time, track.firstSample);
    } else if (continues) {
      // How late this position came: the aircraft must be drawn at least
      // this far behind to have reached the previous one by now. Grow the
      // delay at once, shrink it slowly so one late poll doesn't jerk.
      const need = (nowMs() - track.lastTime) / 1000 + DELAY_MARGIN_S;
      track.targetDelay = Cesium.Math.clamp(
        need > track.targetDelay
          ? need
          : track.targetDelay + (need - track.targetDelay) * DELAY_DECAY,
        MIN_DELAY_S,
        MAX_DELAY_S,
      );
    }

    // Attitude. The tracker only reports heading, so the nose follows the
    // climb angle and the wings bank with the turn rate, as a real aircraft
    // does; on the ground it sits level.
    const speedMps = update.speed * KNOTS_TO_MPS;
    const climbMps = (update.verticalSpeed ?? 0) * FPM_TO_MPS;
    const moving = update.speed >= MIN_HEADING_SPEED_KT;
    const heading = moving || isNew ? update.heading : track.lastHeading;
    const airborne = !onGround && moving;

    let pitch = update.pitch;
    if (pitch === undefined) {
      pitch = airborne
        ? Cesium.Math.toDegrees(Math.atan2(climbMps, speedMps))
        : 0;
    }
    let roll = update.roll;
    if (roll === undefined) {
      roll = 0;
      if (airborne && continues && dt > 0) {
        // Shortest way round: 350° -> 10° is a 20° right turn.
        const turn = ((heading - track.lastHeading + 540) % 360) - 180;
        const turnRate = Cesium.Math.toRadians(turn / dt);
        roll = Cesium.Math.toDegrees(
          Math.atan((speedMps * turnRate) / GRAVITY),
        );
        // Ease in, so a single noisy heading doesn't flick the wings.
        roll = (roll + track.lastRoll) / 2;
      }
    }
    pitch = Cesium.Math.clamp(pitch, -MAX_PITCH_DEG, MAX_PITCH_DEG);
    roll = Cesium.Math.clamp(roll, -MAX_ROLL_DEG, MAX_ROLL_DEG);

    const { headingOffset, pitchOffset, rollOffset } = track.modelSettings;
    const hpr = new Cesium.HeadingPitchRoll(
      Cesium.Math.toRadians(heading + headingOffset),
      Cesium.Math.toRadians(pitch + pitchOffset),
      Cesium.Math.toRadians(roll + rollOffset),
    );

    // Velocity at this position, for the curve. Its size is capped by how
    // far the aircraft actually went, so sparse or noisy reports can't make
    // the curve overshoot or loop.
    let horizontalMps = moving ? speedMps : 0;
    if (continues && !isNew && dt > 0) {
      const covered = Cesium.Cartesian3.distance(track.lastPoint, point) / dt;
      horizontalMps = Math.min(horizontalMps, covered * 1.5 + 1);
    }
    const headingRad = Cesium.Math.toRadians(heading);
    const velocity = Cesium.Matrix4.multiplyByPointAsVector(
      Cesium.Transforms.eastNorthUpToFixedFrame(point),
      new Cesium.Cartesian3(
        Math.sin(headingRad) * horizontalMps,
        Math.cos(headingRad) * horizontalMps,
        airborne ? climbMps : 0,
      ),
      new Cesium.Cartesian3(),
    );

    track.position.addSample(time, point, [velocity]);
    if (onGround) settleOnGround(track, time, update.lat, update.lng, velocity);
    track.ground.addSample(time, onGround ? 1 : 0);
    // Without engine data, an aircraft that flies or moves has it running.
    const engineOn = update.details?.engineOn ?? (airborne || moving);
    track.engine.addSample(time, engineOn ? 1 : 0);
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
    track.lastHeading = heading;
    track.lastRoll = roll;
    if (isNew) Cesium.JulianDate.clone(time, track.firstSample);
    Cesium.JulianDate.clone(time, track.lastSample);
    track.lastTime = timeMs;
    track.lastReport = update;

    for (const record of zoneRecords.values()) {
      if (evaluateZone(record, update.id, update)) styleZone(record);
    }

    if (isNew && update.id === selectedId && cameraMode === "follow") {
      followSelectedAircraft();
    }
  }

  /**
   * Where the drawn path of an aircraft begins: the start of its flight in
   * progress (Unix ms), null when it isn't flying (no path), or undefined
   * when unknown (the last hour).
   */
  function setFlightStart(id: string, startMs: number | null | undefined) {
    const track = tracks.get(id);
    if (!track) return;
    track.flightStart =
      startMs == null ? startMs : Cesium.JulianDate.fromDate(new Date(startMs));
  }

  function removeAircraft(id: string) {
    const track = tracks.get(id);
    if (!track) return;
    if (id === selectedId && cameraMode === "follow") releaseChase();
    // Removing the entities takes the model, label and path with them.
    viewer.entities.remove(track.entity);
    viewer.entities.remove(track.pathEntity);
    trailOwners.delete(track.pathEntity);
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
    if (mode === cameraMode) return;
    cameraMode = mode;
    if (mode === "follow") followSelectedAircraft();
    else releaseChase();
  }

  // Overview of the flight area: looking north at the centre, tilted so the
  // height of zones and the altitude of aircraft are visible.
  function resetCamera(duration = 1.5) {
    cameraMode = "free";
    releaseChase();
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

  function setPaused(value: boolean) {
    paused = value;
    clock.shouldAnimate = !value;
  }

  /** Backend clock minus this computer's, ms, so "now" matches the data. */
  function setClockOffset(offsetMs: number) {
    clockOffsetMs = offsetMs;
  }

  function destroy() {
    removeLightListener();
    removeLightingListener();
    removeChaseListener();
    removeTimeListener();
    viewer.destroy();
  }

  return {
    measureGround,
    setClockOffset,
    updateAircraft,
    removeAircraft,
    resetCamera,
    nudgeCamera,
    setZones,
    setAirfield,
    setAirfieldVisible,
    setTrail,
    setFlightStart,
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
    let ready = false;
    let created: ReturnType<typeof createAircraftScene> | null = null;

    loadCesium()
      .then(async (Cesium) => {
        if (cancelled || !containerRef.current) return;
        const aircraftScene = createAircraftScene(
          Cesium,
          containerRef.current,
          settingsRef.current.center,
          settingsRef.current.googleMapsApiKey,
          (id) => settingsRef.current.onSelectAircraft(id),
        );
        created = aircraftScene;
        // Heights depend on the ground measured at the aerodrome, so nothing
        // with a height is drawn before that (a few seconds at most).
        await aircraftScene.measureGround(settingsRef.current.airfield);
        if (cancelled) return;
        aircraftScene.setZones(settingsRef.current.zones);
        aircraftScene.setAirfield(settingsRef.current.airfield);
        aircraftScene.setAirfieldVisible(settingsRef.current.showAirfield);
        aircraftScene.setSelectedAircraft(
          settingsRef.current.selectedAircraftId,
        );
        aircraftScene.setCameraMode(settingsRef.current.cameraMode);
        aircraftScene.setPaused(settingsRef.current.paused);
        ready = true;
        sceneRef.current = aircraftScene;
        onReady({
          setClockOffset: aircraftScene.setClockOffset,
          updateAircraft: aircraftScene.updateAircraft,
          removeAircraft: aircraftScene.removeAircraft,
          setTrail: aircraftScene.setTrail,
          setFlightStart: aircraftScene.setFlightStart,
          setMarkers: aircraftScene.setMarkers,
          flyTo: aircraftScene.flyTo,
          resetCamera: () => aircraftScene.resetCamera(),
          nudgeCamera: aircraftScene.nudgeCamera,
        });
      })
      .catch((error) => console.error(error));

    return () => {
      cancelled = true;
      if (!created) return;
      if (ready) onReady(null);
      created.destroy();
      sceneRef.current = null;
    };
  }, [onReady]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
