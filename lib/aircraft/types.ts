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

export type FlightZone = {
  id: string;
  name: string;
  /** Polygon outline, in order (either winding); not closed. */
  coordinates: Array<{
    lat: number;
    lng: number;
  }>;
  /** Floor of the volume, feet */
  minAltitude: number;
  /** Ceiling of the volume, feet */
  maxAltitude: number;
  type?: "normal" | "warning" | "restricted";
};

/**
 * Where an aircraft is relative to one zone. "above" / "below" mean it is
 * within the polygon horizontally but outside the altitude band.
 */
export type AircraftZoneState =
  | "outside"
  | "approaching"
  | "inside"
  | "above"
  | "below";

export type AircraftZoneStatus = {
  zone: FlightZone;
  state: AircraftZoneState;
};

export type CameraMode = "follow" | "free";

export type AircraftMapApi = {
  updateAircraft: (update: AircraftUpdate) => void;
  removeAircraft: (id: string) => void;
  resetCamera: () => void;
};
