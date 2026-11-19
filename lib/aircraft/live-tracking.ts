import type {
  AircraftEvent,
  AircraftTrailPoint,
  AircraftUpdate,
  AirfieldLayout,
  FlightZone,
} from "@/types/aircraft";
import type { Alert } from "@/types/alerts";
import type { Tracker } from "@/types/trackers";
import type {
  LatLon,
  LiveTrackingSnapshot,
  TimelineEvent,
  TrackedPosition,
  TrackedZone,
  TrailPoint,
} from "@/types/tracking";

import { isModelUrl, photoImageUrl } from "@/lib/aircraft/model-url";

const METERS_PER_DEG_LAT = 111_320;
const METERS_PER_NM = 1852;
/** Points used to draw a circle zone as a polygon. */
const CIRCLE_SEGMENTS = 64;

const toLatLng = ({ lat, lon }: LatLon) => ({ lat, lng: lon });

function circleToPolygon(center: LatLon, radiusMeters: number) {
  const metersPerDegLng =
    METERS_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180);
  return Array.from({ length: CIRCLE_SEGMENTS }, (_, i) => {
    const angle = (i / CIRCLE_SEGMENTS) * 2 * Math.PI;
    return {
      lat: center.lat + (radiusMeters * Math.cos(angle)) / METERS_PER_DEG_LAT,
      lng: center.lon + (radiusMeters * Math.sin(angle)) / metersPerDegLng,
    };
  });
}

export function toFlightZone(zone: TrackedZone): FlightZone | null {
  let coordinates: FlightZone["coordinates"];
  if (zone.type === "circle" && zone.center && zone.radiusMeters) {
    coordinates = circleToPolygon(zone.center, zone.radiusMeters);
  } else if (zone.points && zone.points.length >= 3) {
    coordinates = zone.points.map(toLatLng);
  } else {
    return null;
  }

  return {
    id: zone.id,
    name: zone.name,
    coordinates,
    holes: zone.holes?.map((hole) => hole.map(toLatLng)),
    minAltitude: zone.floorFt,
    maxAltitude: zone.ceilingFt,
    color: zone.color,
    warningDistanceMeters: zone.lateralWarningBufferNm * METERS_PER_NM,
  };
}

/** Active zones from the snapshot, in the shape the map draws. */
export function toFlightZones(snapshot: LiveTrackingSnapshot): FlightZone[] {
  return toActiveFlightZones(snapshot.zones);
}

/** Active zones, in the shape the map draws. */
export function toActiveFlightZones(zones: TrackedZone[]): FlightZone[] {
  return zones
    .filter((zone) => zone.active)
    .map(toFlightZone)
    .filter((zone): zone is FlightZone => zone !== null);
}

/**
 * Names and labels that positions, alerts and events only refer to by id.
 * Built from the snapshot on the server and passed to the page, so realtime
 * messages are turned into the same shapes as the snapshot.
 */
export type TrackingDirectory = {
  aircraft: Record<
    string,
    Pick<
      LiveTrackingSnapshot["aircraft"][number],
      "name" | "registration" | "type" | "photoUrl" | "pilotId"
    >
  >;
  /** Pilot name by pilot id. */
  pilots: Record<string, string>;
  /** Tracker model by aircraft id. */
  trackerModels: Record<string, string | null>;
};

export function toTrackingDirectory(
  snapshot: LiveTrackingSnapshot,
  trackers: Pick<Tracker, "aircraftId" | "model">[] = [],
): TrackingDirectory {
  return {
    aircraft: Object.fromEntries(
      snapshot.aircraft.map(
        ({ id, name, registration, type, photoUrl, pilotId }) => [
          id,
          { name, registration, type, photoUrl, pilotId },
        ],
      ),
    ),
    pilots: Object.fromEntries(snapshot.pilots.map((p) => [p.id, p.name])),
    trackerModels: Object.fromEntries(
      trackers
        .filter((tracker) => tracker.aircraftId)
        .map((tracker) => [tracker.aircraftId, tracker.model]),
    ),
  };
}

/**
 * One map update from one position (snapshot item or realtime
 * `position.updated`, which have the same shape).
 */
export function toAircraftUpdate(
  position: TrackedPosition,
  directory: TrackingDirectory,
): AircraftUpdate {
  const aircraft = directory.aircraft[position.aircraftId];
  const pilotId = position.pilotId ?? aircraft?.pilotId;
  return {
    id: position.aircraftId,
    name: aircraft?.name,
    callsign: aircraft?.registration,
    details: {
      type: aircraft?.type,
      // A .glb "photo" is the aircraft's 3D model, not a picture.
      photoUrl: photoImageUrl(aircraft?.photoUrl),
      pilotName: pilotId ? (directory.pilots[pilotId] ?? null) : null,
      status: position.status,
      heightAglFt: position.heightAglFt,
      verticalSpeedFpm: position.verticalSpeedFpm,
      distanceToBoundaryNm: position.distanceToBoundaryNm,
      signalStrength: position.signalStrength,
      batteryPercent: position.batteryPercent,
      engineOn: position.engineOn,
      flightId: position.flightId,
      trackerModel: directory.trackerModels[position.aircraftId] ?? null,
    },
    // The map shows its default model when this is undefined.
    modelUrl: isModelUrl(aircraft?.photoUrl) ? aircraft.photoUrl : undefined,
    lat: position.lat,
    lng: position.lon,
    // Above mean sea level (GPS), e.g. ~890 ft on the 907 ft aerodrome.
    altitude: position.altitudeFt,
    speed: position.groundSpeedKt,
    heading: position.headingDeg,
    verticalSpeed: position.verticalSpeedFpm,
    onGround: position.status === "onGround",
    timestamp: position.time,
  };
}

/** One map update per aircraft that has a known position. */
export function toAircraftUpdates(
  snapshot: LiveTrackingSnapshot,
  directory: TrackingDirectory = toTrackingDirectory(snapshot),
): AircraftUpdate[] {
  return snapshot.positions.map((position) =>
    toAircraftUpdate(position, directory),
  );
}

/** What the live map polls (app/api/tracking/live). */
export type LivePositions = {
  /** Backend clock when the snapshot was taken, Unix ms. */
  serverTime: number;
  aircraft: AircraftUpdate[];
  kpis: LiveTrackingSnapshot["kpis"];
  alerts: LiveAlert[];
};

export function toLivePositions(snapshot: LiveTrackingSnapshot): LivePositions {
  const directory = toTrackingDirectory(snapshot);
  return {
    serverTime: snapshot.serverTime,
    aircraft: toAircraftUpdates(snapshot, directory),
    kpis: snapshot.kpis,
    alerts: toLiveAlerts(snapshot, directory),
  };
}

/** The aerodrome from the snapshot, in the shape the map draws. */
export function toAirfieldLayout({
  aerodrome,
}: LiveTrackingSnapshot): AirfieldLayout | null {
  if (!aerodrome?.referencePoint) return null;
  return {
    icao: aerodrome.icao,
    referencePoint: toLatLng(aerodrome.referencePoint),
    elevationFt: aerodrome.elevationFt,
    runwayThresholds: (aerodrome.runwayThresholds ?? []).map(
      ({ designator, threshold }) => ({
        designator,
        threshold: toLatLng(threshold),
      }),
    ),
    circuitPattern: (aerodrome.circuitPattern ?? []).map(toLatLng),
  };
}

/** A currently active alert, as listed next to the map. */
export type LiveAlert = Pick<
  Alert,
  "id" | "type" | "severity" | "title" | "aircraftId" | "triggeredAt"
> & {
  /** Registration of the aircraft, or its id when unknown. */
  aircraftLabel: string;
};

/** One alert (snapshot or realtime `alert.raised` / `alert.updated`). */
export function toLiveAlert(
  { id, type, severity, title, aircraftId, triggeredAt }: Alert,
  directory: TrackingDirectory,
): LiveAlert {
  return {
    id,
    type,
    severity,
    title,
    aircraftId,
    triggeredAt,
    aircraftLabel: directory.aircraft[aircraftId]?.registration ?? aircraftId,
  };
}

/** Whether an alert belongs in the active list. */
export function isActiveAlert(alert: Alert) {
  return alert.isActive && alert.status !== "resolved";
}

/** Active alerts from the snapshot, newest first. */
export function toLiveAlerts(
  snapshot: LiveTrackingSnapshot,
  directory: TrackingDirectory = toTrackingDirectory(snapshot),
): LiveAlert[] {
  return (snapshot.activeAlerts ?? [])
    .map((alert) => toLiveAlert(alert, directory))
    .sort((a, b) => b.triggeredAt - a.triggeredAt);
}

/** A trail from the API, in the shape the map draws. */
export function toAircraftTrail(points: TrailPoint[]): AircraftTrailPoint[] {
  return points.map((point) => ({
    lat: point.lat,
    lng: point.lon,
    altitude: point.altitudeFt,
    timestamp: point.time,
    status: point.status,
  }));
}

/** One timeline event (list item or realtime `timeline.event`). */
export function toAircraftEvent(event: TimelineEvent): AircraftEvent {
  const data = Array.isArray(event.data) ? {} : event.data;
  return {
    id: event.id,
    aircraftId: event.aircraftId,
    type: event.type,
    flightId: event.flightId,
    timestamp: event.time,
    from: data.from,
    to: data.to,
  };
}

/** Timeline events, oldest first. */
export function toAircraftEvents(events: TimelineEvent[]): AircraftEvent[] {
  return events.map(toAircraftEvent).sort((a, b) => a.timestamp - b.timestamp);
}
