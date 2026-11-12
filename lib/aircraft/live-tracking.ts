import type { AircraftUpdate, FlightZone } from "@/types/aircraft";
import type {
  LatLon,
  LiveTrackingSnapshot,
  TrackedZone,
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

function toFlightZone(zone: TrackedZone): FlightZone | null {
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
  return snapshot.zones
    .filter((zone) => zone.active)
    .map(toFlightZone)
    .filter((zone): zone is FlightZone => zone !== null);
}

/** One map update per aircraft that has a known position. */
export function toAircraftUpdates(
  snapshot: LiveTrackingSnapshot,
): AircraftUpdate[] {
  const aircraftById = new Map(snapshot.aircraft.map((a) => [a.id, a]));
  return snapshot.positions.map((position) => {
    const aircraft = aircraftById.get(position.aircraftId);
    return {
      id: position.aircraftId,
      name: aircraft?.name,
      callsign: aircraft?.registration,
      lat: position.lat,
      lng: position.lon,
      // TODO: confirm the reference (AMSL vs WGS84 ellipsoid) with the backend.
      altitude: position.altitudeFt,
      speed: position.groundSpeedKt,
      heading: position.headingDeg,
      timestamp: position.time,
    };
  });
}
