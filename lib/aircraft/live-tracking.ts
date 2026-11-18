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
  TrackedZone,
  TrailPoint,
} from "@/types/tracking";

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
 * One map update per aircraft that has a known position. `trackers` adds the
 * tracker model to the details.
 */
export function toAircraftUpdates(
  snapshot: LiveTrackingSnapshot,
  trackers: Pick<Tracker, "aircraftId" | "model">[] = [],
): AircraftUpdate[] {
  const aircraftById = new Map(snapshot.aircraft.map((a) => [a.id, a]));
  const pilotById = new Map(snapshot.pilots.map((p) => [p.id, p]));
  const trackerByAircraftId = new Map(
    trackers.map((tracker) => [tracker.aircraftId, tracker]),
  );
  return snapshot.positions.map((position) => {
    const aircraft = aircraftById.get(position.aircraftId);
    const pilotId = position.pilotId ?? aircraft?.pilotId;
    return {
      id: position.aircraftId,
      name: aircraft?.name,
      callsign: aircraft?.registration,
      details: {
        type: aircraft?.type,
        photoUrl: aircraft?.photoUrl,
        pilotName: pilotId ? (pilotById.get(pilotId)?.name ?? null) : null,
        status: position.status,
        heightAglFt: position.heightAglFt,
        verticalSpeedFpm: position.verticalSpeedFpm,
        distanceToBoundaryNm: position.distanceToBoundaryNm,
        signalStrength: position.signalStrength,
        batteryPercent: position.batteryPercent,
        engineOn: position.engineOn,
        flightId: position.flightId,
        trackerModel:
          trackerByAircraftId.get(position.aircraftId)?.model ?? null,
      },
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
  });
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
  return {
    serverTime: snapshot.serverTime,
    aircraft: toAircraftUpdates(snapshot),
    kpis: snapshot.kpis,
    alerts: toLiveAlerts(snapshot),
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

/** Active alerts from the snapshot, newest first. */
export function toLiveAlerts(snapshot: LiveTrackingSnapshot): LiveAlert[] {
  const aircraftById = new Map(snapshot.aircraft.map((a) => [a.id, a]));
  return (snapshot.activeAlerts ?? [])
    .map(({ id, type, severity, title, aircraftId, triggeredAt }) => ({
      id,
      type,
      severity,
      title,
      aircraftId,
      triggeredAt,
      aircraftLabel: aircraftById.get(aircraftId)?.registration ?? aircraftId,
    }))
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

/** Timeline events, oldest first. */
export function toAircraftEvents(events: TimelineEvent[]): AircraftEvent[] {
  return events
    .map((event) => {
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
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}
