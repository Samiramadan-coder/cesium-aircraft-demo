"use client";

import { useEffect, useRef } from "react";
// Types only: the Cesium runtime is the prebuilt bundle served from
// public/cesium (see loadCesium), so Next.js never has to bundle it.
import type * as CesiumModule from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import type {
  AircraftMapApi,
  AircraftPositionUpdate,
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

function createAircraftScene(Cesium: Cesium, container: HTMLDivElement) {
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

  const position = new Cesium.SampledPositionProperty();
  position.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
  position.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;

  const orientation = new Cesium.SampledProperty(Cesium.Quaternion);
  orientation.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
  orientation.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;

  const aircraft = viewer.entities.add({
    name: "Aircraft",
    position,
    orientation,
    model: {
      uri: AIRCRAFT_MODEL_URL,
      // Keeps the aircraft visible from far away; true scale up close.
      minimumPixelSize: 72,
      maximumScale: 4000,
    },
    // Travelled route: follows the sampled 3D positions, altitude included.
    path: {
      leadTime: 0,
      trailTime: 60 * 60,
      width: 6,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.2,
        color: Cesium.Color.fromCssColorString("#38bdf8"),
      }),
    },
  });

  const trackPoints: CesiumModule.Cartesian3[] = [];
  let lastHeading = 0;
  let cameraMode: CameraMode = "free";

  function followAircraft() {
    if (trackPoints.length === 0 || viewer.trackedEntity === aircraft) return;
    // Start the chase view behind and above the aircraft (offset is east/north/up).
    const heading = Cesium.Math.toRadians(lastHeading);
    aircraft.viewFrom = new Cesium.Cartesian3(
      -Math.sin(heading) * 260,
      -Math.cos(heading) * 260,
      90,
    );
    viewer.trackedEntity = aircraft;
  }

  function updateAircraftPosition(update: AircraftPositionUpdate) {
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

    position.addSample(time, point);
    orientation.addSample(
      time,
      Cesium.Transforms.headingPitchRollQuaternion(
        point,
        hpr,
        Cesium.Ellipsoid.WGS84,
        northWestUpFrame,
      ),
    );

    const isFirst = trackPoints.length === 0;
    trackPoints.push(point);
    lastHeading = update.heading;

    // Keep the render clock a fixed distance behind the newest sample. It
    // then advances by itself in real time; re-sync only if it has drifted
    // (first update, feed stalled, tab was in the background, ...).
    const lag = Cesium.JulianDate.secondsDifference(time, clock.currentTime);
    const drifted = lag < INTERPOLATION_BUFFER_S / 2 || lag > 4.5;
    if (isFirst || (clock.shouldAnimate && drifted)) {
      clock.currentTime = Cesium.JulianDate.addSeconds(
        time,
        -INTERPOLATION_BUFFER_S,
        new Cesium.JulianDate(),
      );
    }

    if (isFirst && cameraMode === "follow") followAircraft();
  }

  function setCameraMode(mode: CameraMode) {
    cameraMode = mode;
    if (mode === "follow") followAircraft();
    else viewer.trackedEntity = undefined;
  }

  function resetCamera() {
    viewer.trackedEntity = undefined;
    if (trackPoints.length === 0) {
      camera.flyHome(1.5);
      return;
    }
    const area = Cesium.BoundingSphere.fromPoints(trackPoints);
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
    updateAircraftPosition,
    resetCamera,
    setCameraMode,
    setPaused,
    destroy,
  };
}

type AircraftMapProps = {
  cameraMode: CameraMode;
  paused: boolean;
  /** Called with the map API once the viewer exists, and with null on teardown. */
  onReady: (api: AircraftMapApi | null) => void;
};

export default function AircraftMap({
  cameraMode,
  paused,
  onReady,
}: AircraftMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof createAircraftScene> | null>(null);
  // Latest props, for applying to a scene that finishes loading later.
  const settingsRef = useRef({ cameraMode, paused });

  useEffect(() => {
    settingsRef.current = { cameraMode, paused };
    sceneRef.current?.setCameraMode(cameraMode);
    sceneRef.current?.setPaused(paused);
  }, [cameraMode, paused]);

  useEffect(() => {
    let cancelled = false;

    loadCesium()
      .then((Cesium) => {
        if (cancelled || !containerRef.current) return;
        const aircraftScene = createAircraftScene(Cesium, containerRef.current);
        aircraftScene.setCameraMode(settingsRef.current.cameraMode);
        aircraftScene.setPaused(settingsRef.current.paused);
        sceneRef.current = aircraftScene;
        onReady({
          updateAircraftPosition: aircraftScene.updateAircraftPosition,
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
