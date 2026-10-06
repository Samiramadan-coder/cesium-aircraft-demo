"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AircraftControls } from "@/components/aircraft/aircraft-controls";
import { AircraftInfoPanel } from "@/components/aircraft/aircraft-info-panel";
import type {
  Aircraft,
  AircraftMapApi,
  AircraftUpdate,
  CameraMode,
} from "@/lib/aircraft/types";
import {
  FALCON_AIRPORT,
  MOCK_FLIGHT_ZONES,
} from "@/lib/aircraft/mock-flight-data";
import { useMockFlightFeed } from "@/lib/aircraft/use-mock-flight-feed";
import { getPrimaryZoneStatus } from "@/lib/aircraft/zones";

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
  // Latest state of every aircraft, keyed by id. Kept in a ref so the
  // per-second updates of aircraft nobody is looking at don't re-render.
  const aircraftById = useRef(new Map<string, Aircraft>());
  // Who is on the map; only changes when an aircraft appears.
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(
    null,
  );
  const selectedAircraftId = selectedAircraft?.id ?? null;
  // Zones are plain data. Replace the mock with zones loaded from an API
  // (e.g. state filled by a fetch) and nothing else needs to change.
  const zones = MOCK_FLIGHT_ZONES;
  const zoneStatus = selectedAircraft
    ? getPrimaryZoneStatus(selectedAircraft.currentPosition, zones)
    : null;
  const [cameraMode, setCameraMode] = useState<CameraMode>("free");
  const [paused, setPaused] = useState(false);

  // Single entry point for tracking data. A WebSocket handler can call this
  // exact function later instead of the mock feed.
  const updateAircraft = useCallback(
    (update: AircraftUpdate) => {
      mapApi?.updateAircraft(update);

      const { id, lat, lng, altitude, speed, heading } = update;
      const known = aircraftById.current.get(id);
      const aircraft: Aircraft = {
        id,
        name: update.name ?? known?.name ?? id,
        callsign: update.callsign ?? known?.callsign,
        currentPosition: {
          lat,
          lng,
          altitude,
          speed,
          heading,
          timestamp: update.timestamp ?? Date.now(),
        },
      };
      aircraftById.current.set(id, aircraft);

      if (!known) setAircraftList(Array.from(aircraftById.current.values()));
      // Refresh the info panel if this is the selected aircraft; the first
      // aircraft to report is selected automatically.
      setSelectedAircraft((selected) =>
        !selected || selected.id === id ? aircraft : selected,
      );
    },
    [mapApi],
  );

  const selectAircraft = useCallback((id: string) => {
    setSelectedAircraft(aircraftById.current.get(id) ?? null);
  }, []);

  useMockFlightFeed(mapApi !== null && !paused, updateAircraft);

  return (
    <main className="dark fixed inset-0 overflow-hidden bg-black text-foreground">
      <AircraftMap
        center={FALCON_AIRPORT}
        zones={zones}
        selectedAircraftId={selectedAircraftId}
        cameraMode={cameraMode}
        paused={paused}
        onSelectAircraft={selectAircraft}
        onReady={setMapApi}
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col items-start gap-3 p-4 sm:flex-row sm:justify-between">
        <div className="pointer-events-auto">
          <AircraftInfoPanel
            aircraftList={aircraftList}
            aircraft={selectedAircraft}
            zoneStatus={zoneStatus}
            paused={paused}
            onSelectAircraft={selectAircraft}
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
