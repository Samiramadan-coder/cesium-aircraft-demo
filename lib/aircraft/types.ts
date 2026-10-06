export type AircraftPosition = {
  /** Degrees, WGS84 */
  lat: number;
  /** Degrees, WGS84 */
  lng: number;
  /** Feet */
  altitude: number;
  /** Ground speed, knots */
  speed: number;
  /** Degrees true, 0 = north, clockwise */
  heading: number;
  /** Unix epoch, milliseconds */
  timestamp: number;
};

export type Aircraft = {
  /** Stable identity, e.g. the tracker device id */
  id: string;
  name: string;
  callsign?: string;
  currentPosition: AircraftPosition;
};

/**
 * One tracking update for one aircraft. Any data source (mock, WebSocket,
 * ...) only has to produce this shape. An unknown `id` creates the aircraft.
 * `timestamp` defaults to "now"; `pitch` / `roll` (degrees) are optional and
 * default to level flight.
 */
export type AircraftUpdate = Omit<AircraftPosition, "timestamp"> & {
  id: string;
  name?: string;
  callsign?: string;
  timestamp?: number;
  pitch?: number;
  roll?: number;
};

export type CameraMode = "follow" | "free";

export type AircraftMapApi = {
  updateAircraft: (update: AircraftUpdate) => void;
  removeAircraft: (id: string) => void;
  resetCamera: () => void;
};
