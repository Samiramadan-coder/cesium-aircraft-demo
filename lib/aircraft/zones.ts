import type {
  AircraftPosition,
  AircraftZoneState,
  AircraftZoneStatus,
  FlightZone,
} from "./types";

/** How close to a zone's edge (horizontally) counts as "approaching". */
export const ZONE_WARNING_DISTANCE_M = 500;

const METERS_PER_DEG_LAT = 111_320;

type ZonePoint = Pick<AircraftPosition, "lat" | "lng" | "altitude">;

/**
 * Horizontal relation of a point to a zone polygon. Works on a flat local
 * projection in meters centred on the point, which is accurate to well under
 * a meter per kilometer at zone scale (tens of kilometers).
 */
function locateInPolygon(point: ZonePoint, zone: FlightZone) {
  const metersPerDegLng =
    METERS_PER_DEG_LAT * Math.cos((point.lat * Math.PI) / 180);
  const vertices = zone.coordinates.map(({ lat, lng }) => ({
    x: (lng - point.lng) * metersPerDegLng,
    y: (lat - point.lat) * METERS_PER_DEG_LAT,
  }));

  let inside = false;
  let distanceToEdge = Infinity;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i];
    const b = vertices[j];

    // Ray casting: count the edges crossed by a ray from the point (the
    // origin) toward +x. An odd count means the point is inside.
    if (a.y > 0 !== b.y > 0 && a.x + ((0 - a.y) / (b.y - a.y)) * (b.x - a.x) > 0) {
      inside = !inside;
    }

    // Distance from the origin to the edge segment a-b.
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSquared));
    distanceToEdge = Math.min(
      distanceToEdge,
      Math.hypot(a.x + t * dx, a.y + t * dy),
    );
  }

  return { inside, distanceToEdge };
}

/**
 * State of one aircraft position relative to one 3D zone. Altitudes are
 * compared in feet on both sides, the unit the app uses everywhere.
 *
 * "inside" needs both: within the polygon and within the altitude band.
 * "approaching" means outside the polygon, within `warningDistanceMeters` of
 * its edge, and at an altitude that would put the aircraft inside the volume.
 */
export function getAircraftZoneState(
  point: ZonePoint,
  zone: FlightZone,
  warningDistanceMeters = ZONE_WARNING_DISTANCE_M,
): AircraftZoneState {
  const { inside, distanceToEdge } = locateInPolygon(point, zone);
  const below = point.altitude < zone.minAltitude;
  const above = point.altitude > zone.maxAltitude;

  if (inside) return below ? "below" : above ? "above" : "inside";
  if (!below && !above && distanceToEdge <= warningDistanceMeters) {
    return "approaching";
  }
  return "outside";
}

const STATE_PRIORITY: Record<AircraftZoneState, number> = {
  inside: 4,
  approaching: 3,
  below: 2,
  above: 1,
  outside: 0,
};

/**
 * The zone that matters most for an aircraft right now (inside beats
 * approaching beats under/over), or null if it is clear of every zone.
 */
export function getPrimaryZoneStatus(
  point: ZonePoint,
  zones: FlightZone[],
  warningDistanceMeters = ZONE_WARNING_DISTANCE_M,
): AircraftZoneStatus | null {
  let primary: AircraftZoneStatus | null = null;
  for (const zone of zones) {
    const state = getAircraftZoneState(point, zone, warningDistanceMeters);
    if (
      state !== "outside" &&
      (!primary || STATE_PRIORITY[state] > STATE_PRIORITY[primary.state])
    ) {
      primary = { zone, state };
    }
  }
  return primary;
}
