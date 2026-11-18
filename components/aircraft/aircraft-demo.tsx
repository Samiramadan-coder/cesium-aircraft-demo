"use client";

import type {
  Aircraft,
  AircraftEvent,
  AircraftTrailPoint,
  CameraMode,
  AircraftMapApi,
  AircraftUpdate,
  AirfieldLayout,
  FlightZone,
} from "@/types/aircraft";
import type { LiveTrackingKpis } from "@/types/tracking";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LiveAlert, LivePositions } from "@/lib/aircraft/live-tracking";
import { eventColor, findTrailPoint, isMapEvent } from "@/lib/aircraft/events";
import { useEventLabel } from "@/components/aircraft/aircraft-events";
import { getPrimaryZoneStatus } from "@/lib/aircraft/zones";
import { FALCON_AIRPORT } from "@/lib/aircraft/flight-zones";
import { AircraftControls } from "@/components/aircraft/aircraft-controls";
import { AircraftInfoPanel } from "@/components/aircraft/aircraft-info-panel";
import { AircraftKpis } from "@/components/aircraft/aircraft-kpis";
import { AircraftAlerts } from "@/components/aircraft/aircraft-alerts";

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
  /** Last known position of every tracked aircraft (GET /v1/tracking/live). */
  initialAircraft: AircraftUpdate[];
  /** Recent route of each aircraft, by aircraft id (…/{aircraft}/trail). */
  trails: Record<string, AircraftTrailPoint[]>;
  /** Recent events of all aircraft, oldest first (…/live/timeline). */
  events: AircraftEvent[];
  /** Airspace to draw (GET /v1/tracking/live). */
  zones: FlightZone[];
  /** Fleet counters from the snapshot (GET /v1/tracking/live). */
  kpis: LiveTrackingKpis;
  /** Home aerodrome (runway, circuit), drawn on the map. */
  airfield: AirfieldLayout | null;
  /** Alerts active when the snapshot was taken. */
  alerts: LiveAlert[];
  /** No position for this long marks an aircraft's signal as lost. */
  signalLossTimeoutSec?: number;
  /** Backend clock when the snapshot was taken, Unix ms. */
  serverTime: number;
};

/** How often the latest positions are fetched. */
const POLL_INTERVAL_MS = 3_000;

// Client side of the home page: the Cesium map and its live state.
// Data fetched by the server page is passed in as props.
export function AircraftDemo({
  googleMapsApiKey,
  hasMapKey,
  initialAircraft,
  trails,
  events,
  zones,
  airfield,
  alerts: initialAlerts,
  kpis: initialKpis,
  signalLossTimeoutSec,
  serverTime,
}: AircraftDemoProps) {
  const t = useTranslations("AircraftDemo");
  const [mapApi, setMapApi] = useState<AircraftMapApi | null>(null);
  const [kpis, setKpis] = useState(initialKpis);
  const [alerts, setAlerts] = useState(initialAlerts);
  // Latest state of every aircraft, keyed by id. Kept in a ref so the
  // per-second updates of aircraft nobody is looking at don't re-render.
  const aircraftById = useRef(new Map<string, Aircraft>());
  // Who is on the map; only changes when an aircraft appears.
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(
    null,
  );
  const selectedAircraftId = selectedAircraft?.id ?? null;
  const zoneStatus = selectedAircraft
    ? getPrimaryZoneStatus(selectedAircraft.currentPosition, zones)
    : null;
  const [cameraMode, setCameraMode] = useState<CameraMode>("free");
  const [paused, setPaused] = useState(false);
  const [showAirfield, setShowAirfield] = useState(true);
  const center = useMemo(
    () => airfield?.referencePoint ?? FALCON_AIRPORT,
    [airfield],
  );

  // Single entry point for tracking data. A WebSocket handler can call this
  // exact function later instead of the mock feed.
  const updateAircraft = useCallback(
    (update: AircraftUpdate) => {
      const { id, lat, lng, altitude, speed, heading } = update;
      const known = aircraftById.current.get(id);
      // Polling returns the same position until the tracker reports again.
      if (known && update.timestamp === known.currentPosition.timestamp) return;
      mapApi?.updateAircraft(update);
      const aircraft: Aircraft = {
        id,
        name: update.name ?? known?.name ?? id,
        callsign: update.callsign ?? known?.callsign,
        // Polled updates don't carry the tracker model; keep the known one.
        details: update.details
          ? {
              ...update.details,
              trackerModel:
                update.details.trackerModel ?? known?.details?.trackerModel,
            }
          : known?.details,
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

  // Put the snapshot from the server on the map once it is ready.
  useEffect(() => {
    if (!mapApi) return;
    mapApi.setClockOffset(serverTime - Date.now());
    for (const [id, points] of Object.entries(trails)) {
      mapApi.setTrail(id, points);
    }
    for (const update of initialAircraft) updateAircraft(update);
  }, [mapApi, trails, initialAircraft, updateAircraft, serverTime]);

  // Then keep it live. TODO: replace with the backend's WebSocket feed once
  // it exists; updateAircraft stays the single entry point.
  useEffect(() => {
    if (!mapApi) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      // Hidden tabs don't need positions; resume on the next tick.
      if (document.visibilityState === "visible") {
        try {
          const sentAt = Date.now();
          const response = await fetch("/api/tracking/live", {
            cache: "no-store",
            signal: controller.signal,
          });
          if (response.ok) {
            const live: LivePositions = await response.json();
            // The snapshot was taken somewhere during the request.
            mapApi.setClockOffset(live.serverTime - (sentAt + Date.now()) / 2);
            for (const update of live.aircraft) updateAircraft(update);
            setKpis(live.kpis);
            setAlerts(live.alerts);
          } else if (response.status === 401) {
            // Session ended: reloading sends the user to sign in.
            window.location.reload();
            return;
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          console.error("[live] Polling failed", error);
        }
      }
      if (!controller.signal.aborted)
        timer = setTimeout(poll, POLL_INTERVAL_MS);
    };
    timer = setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [mapApi, updateAircraft]);

  // Events of the selected aircraft, and where each one happened.
  const selectedEvents = useMemo(
    () => events.filter((event) => event.aircraftId === selectedAircraftId),
    [events, selectedAircraftId],
  );
  const eventPositions = useMemo(() => {
    const trail = selectedAircraftId ? (trails[selectedAircraftId] ?? []) : [];
    const positions = new Map<string, AircraftTrailPoint>();
    for (const event of selectedEvents) {
      const point = findTrailPoint(trail, event.timestamp);
      if (point) positions.set(event.id, point);
    }
    return positions;
  }, [selectedEvents, selectedAircraftId, trails]);
  const locatableEvents = useMemo(
    () => new Set(eventPositions.keys()),
    [eventPositions],
  );

  // Markers for the selected aircraft's takeoffs, landings and warnings.
  const eventLabel = useEventLabel();
  useEffect(() => {
    mapApi?.setMarkers(
      selectedEvents.flatMap((event) => {
        const point = eventPositions.get(event.id);
        if (!point || !isMapEvent(event)) return [];
        return [
          {
            id: event.id,
            lat: point.lat,
            lng: point.lng,
            altitude: point.altitude,
            label: eventLabel(event),
            color: eventColor(event),
          },
        ];
      }),
    );
  }, [mapApi, selectedEvents, eventPositions, eventLabel]);

  const showEvent = useCallback(
    (event: AircraftEvent) => {
      const point = eventPositions.get(event.id);
      if (!point) return;
      setCameraMode("free");
      mapApi?.flyTo(point);
    },
    [mapApi, eventPositions],
  );

  return (
    // Fills the shell's content area (see components/layout/app-shell.tsx).
    <div className="dark absolute inset-0 overflow-hidden bg-black text-foreground">
      <AircraftMap
        center={center}
        googleMapsApiKey={googleMapsApiKey}
        zones={zones}
        airfield={airfield}
        showAirfield={showAirfield}
        selectedAircraftId={selectedAircraftId}
        cameraMode={cameraMode}
        paused={paused}
        onSelectAircraft={selectAircraft}
        onReady={setMapApi}
      />

      {/* Phones: controls on top, info panel docked at the bottom (above the
          Cesium credits). Wider screens: panel and controls side by side. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col-reverse justify-between gap-3 p-3 pb-9 sm:flex-row sm:items-start sm:p-4">
        <div className="pointer-events-auto flex w-full flex-col gap-2 sm:max-h-full sm:w-72">
          <AircraftKpis kpis={kpis} />
          <AircraftInfoPanel
            aircraftList={aircraftList}
            aircraft={selectedAircraft}
            zoneStatus={zoneStatus}
            paused={paused}
            signalLossTimeoutSec={signalLossTimeoutSec}
            following={cameraMode === "follow"}
            onToggleFollow={() =>
              setCameraMode((mode) => (mode === "follow" ? "free" : "follow"))
            }
            events={selectedEvents}
            locatableEvents={locatableEvents}
            onSelectEvent={showEvent}
            onSelectAircraft={selectAircraft}
          />
          <AircraftAlerts alerts={alerts} onSelectAircraft={selectAircraft} />
        </div>
        <div className="pointer-events-auto self-end sm:self-auto">
          <AircraftControls
            cameraMode={cameraMode}
            paused={paused}
            showAirfield={showAirfield}
            onShowAirfieldChange={setShowAirfield}
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
        <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center px-4 sm:top-auto sm:bottom-10">
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
