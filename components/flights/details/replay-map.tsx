"use client";

import { useEffect, useRef } from "react";
import type * as CesiumModule from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import {
  type Cesium,
  FEET_TO_METERS,
  createViewer,
  loadCesium,
} from "@/lib/aircraft/cesium";
import type { FlightZone } from "@/types/aircraft";
import type { ReplayPoint } from "@/types/flights";

export type ReplayCamera = "follow" | "overview" | "topDown";

export type ReplayMapApi = {
  /** Jumps the replay to `time` (Unix ms). */
  seek: (time: number) => void;
};

const MODEL_URL = "/models/aircraft.glb";
/** How often the current time is reported to React while playing. */
const TICK_INTERVAL_MS = 100;

const COLORS = {
  trail: "#e3a55a",
  route: "#ffffff",
  takeoff: "#22c55e",
  landing: "#f59e0b",
};

function createReplayScene(
  Cesium: Cesium,
  container: HTMLDivElement,
  points: ReplayPoint[],
  zones: FlightZone[],
  googleMapsApiKey: string | undefined,
  onTime: (time: number) => void,
  onEnded: () => void,
) {
  const viewer = createViewer(Cesium, container, googleMapsApiKey);
  const { scene, clock, camera } = viewer;

  // Light the scene from the camera so the aircraft is never in the dark,
  // whatever time of day the flight was.
  const light = new Cesium.DirectionalLight({ direction: camera.directionWC });
  scene.light = light;
  const removeLightListener = scene.preRender.addEventListener(() => {
    light.direction = Cesium.Cartesian3.clone(camera.directionWC, light.direction);
  });

  // Zones: extruded from floor to ceiling, labelled "Name · 2,000 ft".
  const feet = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  for (const zone of zones) {
    const color = Cesium.Color.fromCssColorString(zone.color ?? "#34d399");
    const hierarchy = new Cesium.PolygonHierarchy(
      Cesium.Cartesian3.fromDegreesArray(
        zone.coordinates.flatMap((c) => [c.lng, c.lat]),
      ),
      zone.holes?.map(
        (hole) =>
          new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(hole.flatMap((c) => [c.lng, c.lat])),
          ),
      ),
    );
    const count = zone.coordinates.length;
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        zone.coordinates.reduce((sum, c) => sum + c.lng, 0) / count,
        zone.coordinates.reduce((sum, c) => sum + c.lat, 0) / count,
        zone.maxAltitude * FEET_TO_METERS,
      ),
      polygon: {
        hierarchy,
        height: zone.minAltitude * FEET_TO_METERS,
        extrudedHeight: zone.maxAltitude * FEET_TO_METERS,
        material: color.withAlpha(0.18),
        outline: true,
        outlineColor: color.withAlpha(0.9),
      },
      label: {
        text: `${zone.name} · ${feet.format(zone.maxAltitude)} ft`,
        font: "12px sans-serif",
        showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  }

  const start = Cesium.JulianDate.fromDate(new Date(points[0].time));
  const stop = Cesium.JulianDate.fromDate(new Date(points.at(-1)!.time));
  const positions = points.map((p) =>
    Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.altitudeFt * FEET_TO_METERS),
  );

  const position = new Cesium.SampledPositionProperty();
  position.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
  position.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
  points.forEach((p, i) =>
    position.addSample(Cesium.JulianDate.fromDate(new Date(p.time)), positions[i]),
  );

  // The whole route, faint, so the flight's shape shows before playing.
  if (positions.length > 1) {
    viewer.entities.add({
      polyline: {
        positions,
        width: 2,
        material: Cesium.Color.fromCssColorString(COLORS.route).withAlpha(0.35),
      },
    });
  }

  // The flown part, drawn up to the current replay time.
  const durationS = Cesium.JulianDate.secondsDifference(stop, start);
  const aircraft = viewer.entities.add({
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({ start, stop }),
    ]),
    position,
    // Nose along the direction of travel (the model's nose is +X).
    orientation: new Cesium.VelocityOrientationProperty(position),
    model: { uri: MODEL_URL, minimumPixelSize: 56, maximumScale: 4000 },
    path: {
      leadTime: 0,
      trailTime: durationS + 1,
      width: 4,
      resolution: 1,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.2,
        color: Cesium.Color.fromCssColorString(COLORS.trail),
      }),
    },
  });

  const marker = (at: CesiumModule.Cartesian3, color: string) =>
    viewer.entities.add({
      position: at,
      point: {
        pixelSize: 12,
        color: Cesium.Color.fromCssColorString(color),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  marker(positions[0], COLORS.takeoff);
  if (positions.length > 1) marker(positions.at(-1)!, COLORS.landing);

  clock.startTime = start.clone();
  clock.stopTime = stop.clone();
  clock.currentTime = start.clone();
  clock.clockRange = Cesium.ClockRange.CLAMPED;
  clock.shouldAnimate = false;

  // Report the replay time to React, throttled; and notice the end.
  let lastReport = 0;
  const report = () => {
    onTime(Cesium.JulianDate.toDate(clock.currentTime).getTime());
  };
  const removeTickListener = clock.onTick.addEventListener(() => {
    if (!clock.shouldAnimate) return;
    const now = performance.now();
    if (now - lastReport >= TICK_INTERVAL_MS) {
      lastReport = now;
      report();
    }
    if (Cesium.JulianDate.greaterThanOrEquals(clock.currentTime, stop)) {
      report();
      onEnded();
    }
  });

  const routeSphere = Cesium.BoundingSphere.fromPoints(positions);
  // Never zoom in closer than ~1.5 km, e.g. for a ground run.
  routeSphere.radius = Math.max(routeSphere.radius, 1500);

  let cameraMode: ReplayCamera = "overview";

  function setCamera(mode: ReplayCamera, duration = 1.2) {
    cameraMode = mode;
    if (mode === "follow") {
      // Behind, beside and above the aircraft (east/north/up offset).
      aircraft.viewFrom = new Cesium.Cartesian3(-300, -300, 150);
      viewer.trackedEntity = aircraft;
      return;
    }
    viewer.trackedEntity = undefined;
    const pitch = mode === "topDown" ? -90 : -45;
    camera.flyToBoundingSphere(routeSphere, {
      duration,
      offset: new Cesium.HeadingPitchRange(
        0,
        Cesium.Math.toRadians(pitch),
        routeSphere.radius * (mode === "topDown" ? 3 : 2.6),
      ),
    });
  }
  setCamera("overview", 0);

  return {
    setPlaying(playing: boolean) {
      // Playing again after the end starts over.
      if (playing && Cesium.JulianDate.greaterThanOrEquals(clock.currentTime, stop)) {
        clock.currentTime = start.clone();
      }
      clock.shouldAnimate = playing;
    },
    setSpeed(speed: number) {
      clock.multiplier = speed;
    },
    setCamera(mode: ReplayCamera) {
      if (mode !== cameraMode || mode !== "follow") setCamera(mode);
    },
    seek(time: number) {
      clock.currentTime = Cesium.JulianDate.fromDate(new Date(time));
      report();
    },
    destroy() {
      removeTickListener();
      removeLightListener();
      viewer.destroy();
    },
  };
}

type ReplayMapProps = {
  points: ReplayPoint[];
  zones: FlightZone[];
  googleMapsApiKey?: string;
  playing: boolean;
  speed: number;
  camera: ReplayCamera;
  /** The replay time (Unix ms), reported while playing and after a seek. */
  onTime: (time: number) => void;
  onEnded: () => void;
  onReady: (api: ReplayMapApi | null) => void;
  onError: () => void;
};

export default function ReplayMap(props: ReplayMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof createReplayScene> | null>(null);
  // Latest props, read by the scene's callbacks and when it finishes loading.
  const propsRef = useRef(props);

  const { playing, speed, camera } = props;

  useEffect(() => {
    propsRef.current = props;
  });

  useEffect(() => {
    sceneRef.current?.setPlaying(playing);
  }, [playing]);

  useEffect(() => {
    sceneRef.current?.setSpeed(speed);
  }, [speed]);

  useEffect(() => {
    sceneRef.current?.setCamera(camera);
  }, [camera]);

  useEffect(() => {
    let cancelled = false;

    loadCesium()
      .then((Cesium) => {
        if (cancelled || !containerRef.current) return;
        const current = propsRef.current;
        const scene = createReplayScene(
          Cesium,
          containerRef.current,
          current.points,
          current.zones,
          current.googleMapsApiKey,
          (time) => propsRef.current.onTime(time),
          () => propsRef.current.onEnded(),
        );
        scene.setSpeed(current.speed);
        scene.setCamera(current.camera);
        scene.setPlaying(current.playing);
        sceneRef.current = scene;
        current.onReady({ seek: scene.seek });
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) propsRef.current.onError();
      });

    return () => {
      cancelled = true;
      if (!sceneRef.current) return;
      propsRef.current.onReady(null);
      sceneRef.current.destroy();
      sceneRef.current = null;
    };
    // The scene is built once per flight; later prop changes go through the
    // effects above.
  }, []);

  return <div ref={containerRef} className="absolute inset-0" />;
}
