import type { AircraftPosition } from "./types";

export const MOCK_AIRCRAFT = {
  callsign: "A6-CSM",
  type: "Cesium Air · Demo flight",
};

export const UPDATE_INTERVAL_MS = 1000;

type Waypoint = {
  lat: number;
  lng: number;
  /** Target altitude, feet */
  altitude: number;
  /** Target ground speed, knots */
  speed: number;
};

// Scenic loop out of Fujairah (OMFJ) over the Hajar mountains, UAE.
// Flown as a closed circuit, so the simulation never runs out of route.
export const MOCK_ROUTE: Waypoint[] = [
  { lat: 25.112, lng: 56.33, altitude: 2500, speed: 120 },
  { lat: 25.17, lng: 56.26, altitude: 4500, speed: 145 },
  { lat: 25.26, lng: 56.18, altitude: 6500, speed: 150 },
  { lat: 25.33, lng: 56.05, altitude: 7500, speed: 155 },
  { lat: 25.25, lng: 55.93, altitude: 7500, speed: 155 },
  { lat: 25.12, lng: 55.98, altitude: 7000, speed: 150 },
  { lat: 25.03, lng: 56.12, altitude: 6500, speed: 150 },
  { lat: 25.04, lng: 56.27, altitude: 4500, speed: 135 },
];

const METERS_PER_DEG_LAT = 111_320;
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
 * Small kinematic simulation that flies the route one tracking update at a
 * time. Each call to `next()` advances the flight by one update interval and
 * returns what a tracker would report: turns are rate-limited, climbs and
 * speed changes are gradual, and heading always matches the actual track.
 */
export function createMockFlight(startTimestamp = Date.now()) {
  const dt = UPDATE_INTERVAL_MS / 1000;
  const start = MOCK_ROUTE[0];
  let targetIndex = 1;
  let state: AircraftPosition = {
    lat: start.lat,
    lng: start.lng,
    altitude: start.altitude,
    speed: start.speed,
    heading: bearingAndDistance(start, MOCK_ROUTE[1]).bearing,
    timestamp: startTimestamp,
  };
  let started = false;

  return {
    next(): AircraftPosition {
      if (!started) {
        started = true;
        return state;
      }

      let target = MOCK_ROUTE[targetIndex];
      let leg = bearingAndDistance(state, target);
      if (leg.distance < WAYPOINT_CAPTURE_M) {
        targetIndex = (targetIndex + 1) % MOCK_ROUTE.length;
        target = MOCK_ROUTE[targetIndex];
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
