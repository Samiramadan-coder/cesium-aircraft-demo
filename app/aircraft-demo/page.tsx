"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { AircraftControls } from "@/components/aircraft/aircraft-controls";
import { AircraftInfoPanel } from "@/components/aircraft/aircraft-info-panel";
import { MOCK_AIRCRAFT } from "@/lib/aircraft/mock-flight-data";
import type {
  AircraftMapApi,
  AircraftPosition,
  CameraMode,
} from "@/lib/aircraft/types";
import { useMockFlightFeed } from "@/lib/aircraft/use-mock-flight-feed";

// Cesium needs window/WebGL, so the map is loaded in the browser only.
const AircraftMap = dynamic(
  () => import("@/components/aircraft/aircraft-map"),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
        Loading 3D globe…
      </div>
    ),
  },
);

const hasIonToken = Boolean(process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN);

export default function AircraftDemoPage() {
  const [mapApi, setMapApi] = useState<AircraftMapApi | null>(null);
  const [position, setPosition] = useState<AircraftPosition | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [paused, setPaused] = useState(false);

  // Single entry point for tracking data. A WebSocket handler can call this
  // exact function later instead of the mock feed.
  const handlePositionUpdate = useCallback(
    (update: AircraftPosition) => {
      mapApi?.updateAircraftPosition(update);
      setPosition(update);
    },
    [mapApi],
  );

  useMockFlightFeed(mapApi !== null && !paused, handlePositionUpdate);

  return (
    <main className="dark fixed inset-0 overflow-hidden bg-black text-foreground">
      <AircraftMap cameraMode={cameraMode} paused={paused} onReady={setMapApi} />

      <div className="pointer-events-none absolute inset-0 flex flex-col items-start gap-3 p-4 sm:flex-row sm:justify-between">
        <div className="pointer-events-auto">
          <AircraftInfoPanel
            name={MOCK_AIRCRAFT.callsign}
            description={MOCK_AIRCRAFT.type}
            position={position}
            paused={paused}
          />
        </div>
        <div className="pointer-events-auto">
          <AircraftControls
            cameraMode={cameraMode}
            paused={paused}
            onCameraModeChange={setCameraMode}
            onResetCamera={() => {
              setCameraMode("free");
              mapApi?.resetCamera();
            }}
            onPausedChange={setPaused}
          />
        </div>
      </div>

      {!hasIonToken && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center px-4">
          <p className="rounded-md bg-amber-500/15 px-3 py-1.5 text-xs text-amber-200 ring-1 ring-amber-500/30 backdrop-blur">
            NEXT_PUBLIC_CESIUM_ION_TOKEN is not set — terrain and imagery may
            not load. Add it to .env.local and restart.
          </p>
        </div>
      )}
    </main>
  );
}
