"use client";

import type {
  Aircraft,
  CameraMode,
  AircraftMapApi,
  AircraftUpdate,
} from "@/types/aircraft";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { getPrimaryZoneStatus } from "@/lib/aircraft/zones";
import { useMockFlightFeed } from "@/lib/aircraft/use-mock-flight-feed";
import { FALCON_AIRPORT, FLIGHT_ZONES } from "@/lib/aircraft/flight-zones";
import { AircraftControls } from "@/components/aircraft/aircraft-controls";
import { AircraftInfoPanel } from "@/components/aircraft/aircraft-info-panel";

function MapLoading() {
  const t = useTranslations("AircraftDemo");
  return (
    <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
      {t("loadingGlobe")}
    </div>
  );
}

// Cesium needs window/WebGL, so the map is loaded in the browser only.
const AircraftMap = dynamic(
  () => import("@/components/aircraft/aircraft-map"),
  {
    ssr: false,
    loading: () => <MapLoading />,
  },
);

type AircraftDemoProps = {
  // Google Photorealistic 3D Tiles key; the map falls back to Cesium ion
  // without it. Can later come per customer from the backend instead.
  googleMapsApiKey?: string;
  hasMapKey: boolean;
};

// Client side of the home page: the Cesium map and its live state.
// Data fetched by the server page is passed in as props.
export function AircraftDemo({
  googleMapsApiKey,
  hasMapKey,
}: AircraftDemoProps) {
  const t = useTranslations("AircraftDemo");
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
  // The airspace is fixed (see lib/aircraft/flight-zones.ts).
  const zones = FLIGHT_ZONES;
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
        modelUrl: update.modelUrl ?? known?.modelUrl,
        modelScale: update.modelScale ?? known?.modelScale,
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
    // Fills the shell's content area (see components/layout/app-shell.tsx).
    <div className="dark absolute inset-0 overflow-hidden bg-black text-foreground">
      <AircraftMap
        center={FALCON_AIRPORT}
        googleMapsApiKey={googleMapsApiKey}
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

      {!hasMapKey && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center px-4">
          <p className="rounded-md bg-amber-500/15 px-3 py-1.5 text-xs text-amber-200 ring-1 ring-amber-500/30 backdrop-blur">
            {t("mapKeyMissing", {
              googleVariable: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
              ionVariable: "NEXT_PUBLIC_CESIUM_ION_TOKEN",
              file: ".env.local",
            })}
          </p>
        </div>
      )}
    </div>
  );
}
