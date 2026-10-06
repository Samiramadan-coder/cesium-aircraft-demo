import type { AircraftPosition, FlightZone } from "./types";

export const UPDATE_INTERVAL_MS = 1000;

type Waypoint = {
  lat: number;
  lng: number;
  /** Target altitude, feet */
  altitude: number;
  /** Target ground speed, knots */
  speed: number;
};

type MockAircraft = {
  id: string;
  name: string;
  callsign: string;
  route: Waypoint[];
};

const METERS_PER_DEG_LAT = 111_320;

/** Centre of the demo: everything below is laid out relative to it. */
export const FALCON_AIRPORT = {
  lat: 24.467333,
  lng: 55.626056,
};

/** A point `eastKm` / `northKm` away from Falcon Airport. */
function fromAirport(eastKm: number, northKm: number) {
  const metersPerDegLng =
    METERS_PER_DEG_LAT * Math.cos((FALCON_AIRPORT.lat * Math.PI) / 180);
  return {
    lat: +(FALCON_AIRPORT.lat + (northKm * 1000) / METERS_PER_DEG_LAT).toFixed(
      6,
    ),
    lng: +(FALCON_AIRPORT.lng + (eastKm * 1000) / metersPerDegLng).toFixed(6),
  };
}

// Demo traffic around Falcon Airport. Every route is flown as a closed
// circuit, so the simulation never runs out of route. Add or remove entries
// freely: nothing else depends on how many there are.
export const MOCK_AIRCRAFT: MockAircraft[] = [
  {
    // Arrives from the southwest, overflies the airport, continues northeast
    // and returns around the south. 2,500-3,500 ft.
    id: "ac-001",
    name: "Southwest Arrival",
    callsign: "A6-CSM",
    route: [
      { ...fromAirport(-8, -6), altitude: 3500, speed: 125 },
      { ...fromAirport(-4, -3), altitude: 3000, speed: 120 },
      { ...fromAirport(0, 0), altitude: 2500, speed: 115 },
      { ...fromAirport(5, 3.5), altitude: 3000, speed: 120 },
      { ...fromAirport(10, 7), altitude: 3500, speed: 130 },
      { ...fromAirport(12, -1), altitude: 3500, speed: 130 },
      { ...fromAirport(5, -9), altitude: 3500, speed: 130 },
      { ...fromAirport(-5, -10.5), altitude: 3500, speed: 130 },
    ],
  },
  {
    // Crosses the zone from the northwest to the southeast, east of the
    // airport, and returns around the north. 3,500-4,500 ft.
    id: "ac-002",
    name: "Northwest Crossing",
    callsign: "A6-KFK",
    route: [
      { ...fromAirport(-7, 7.5), altitude: 4500, speed: 140 },
      { ...fromAirport(-3, 3.5), altitude: 4000, speed: 135 },
      { ...fromAirport(3, -2.5), altitude: 3500, speed: 130 },
      { ...fromAirport(8, -7), altitude: 4000, speed: 135 },
      { ...fromAirport(12.5, -2), altitude: 4500, speed: 140 },
      { ...fromAirport(10, 6), altitude: 4500, speed: 140 },
      { ...fromAirport(3, 10.5), altitude: 4500, speed: 140 },
    ],
  },
  {
    // Low, slow clockwise circuit around the outside of the zone.
    // 1,500-3,000 ft.
    id: "ac-003",
    name: "Perimeter Patrol",
    callsign: "A6-HJR",
    route: [
      { ...fromAirport(0, 8), altitude: 3000, speed: 105 },
      { ...fromAirport(6.5, 4), altitude: 2500, speed: 100 },
      { ...fromAirport(7, -3), altitude: 2000, speed: 100 },
      { ...fromAirport(2, -7.5), altitude: 1500, speed: 95 },
      { ...fromAirport(-5, -6.5), altitude: 2000, speed: 100 },
      { ...fromAirport(-7.5, 0), altitude: 2500, speed: 105 },
      { ...fromAirport(-5, 6), altitude: 3000, speed: 105 },
    ],
  },
];

// The airspace around Falcon Airport, roughly 4-5 km out in every direction.
// Temporary data source: the map and the zone logic only ever see a
// FlightZone[], wherever it comes from.
export const MOCK_FLIGHT_ZONES: FlightZone[] = [
  {
    id: "zone-falcon",
    name: "Falcon Airport Zone",
    type: "normal",
    minAltitude: 0,
    maxAltitude: 5000,
    coordinates: [
      fromAirport(-4.5, -1.5),
      fromAirport(-2, -4),
      fromAirport(2.5, -3.5),
      fromAirport(4.5, 0),
      fromAirport(2.5, 3.5),
      fromAirport(-2.5, 3.5),
    ],
  },
];

const KNOTS_TO_MPS = 0.514444;
const TURN_RATE_DEG_S = 3; // standard rate turn
const CLIMB_RATE_FT_S = 25; // 1,500 fpm
const DESCENT_RATE_FT_S = 20; // 1,200 fpm
const ACCELERATION_KT_S = 1.5;
const WAYPOINT_CAPTURE_M = 1800;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

function stepToward(current: number, target: number, up: number, down = up) {
  if (target > current) return Math.min(target, current + up);
  return Math.max(target, current - down);
}

function bearingAndDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
  const north = (to.lat - from.lat) * METERS_PER_DEG_LAT;
  const east =
    (to.lng - from.lng) * METERS_PER_DEG_LAT * Math.cos(toRad(from.lat));
  return {
    bearing: (toDeg(Math.atan2(east, north)) + 360) % 360,
    distance: Math.hypot(north, east),
  };
}

/**
 * Small kinematic simulation that flies a route one tracking update at a
 * time. Each call to `next()` advances the flight by one update interval and
 * returns what a tracker would report: turns are rate-limited, climbs and
 * speed changes are gradual, and heading always matches the actual track.
 */
export function createMockFlight(
  route: Waypoint[],
  startTimestamp = Date.now(),
) {
  const dt = UPDATE_INTERVAL_MS / 1000;
  const start = route[0];
  let targetIndex = 1;
  let state: AircraftPosition = {
    lat: start.lat,
    lng: start.lng,
    altitude: start.altitude,
    speed: start.speed,
    heading: bearingAndDistance(start, route[1]).bearing,
    timestamp: startTimestamp,
  };
  let started = false;

  return {
    next(): AircraftPosition {
      if (!started) {
        started = true;
        return state;
      }

      let target = route[targetIndex];
      let leg = bearingAndDistance(state, target);
      if (leg.distance < WAYPOINT_CAPTURE_M) {
        targetIndex = (targetIndex + 1) % route.length;
        target = route[targetIndex];
        leg = bearingAndDistance(state, target);
      }

      const turn = ((leg.bearing - state.heading + 540) % 360) - 180;
      const maxTurn = TURN_RATE_DEG_S * dt;
      const heading =
        (state.heading + Math.max(-maxTurn, Math.min(maxTurn, turn)) + 360) %
        360;

      const speed = stepToward(
        state.speed,
        target.speed,
        ACCELERATION_KT_S * dt,
      );
      const altitude = stepToward(
        state.altitude,
        target.altitude,
        CLIMB_RATE_FT_S * dt,
        DESCENT_RATE_FT_S * dt,
      );

      const distance = speed * KNOTS_TO_MPS * dt;
      const lat =
        state.lat + (distance * Math.cos(toRad(heading))) / METERS_PER_DEG_LAT;
      const lng =
        state.lng +
        (distance * Math.sin(toRad(heading))) /
          (METERS_PER_DEG_LAT * Math.cos(toRad(state.lat)));

      state = {
        lat,
        lng,
        altitude,
        speed,
        heading,
        timestamp: state.timestamp + UPDATE_INTERVAL_MS,
      };
      return state;
    },
  };
}
