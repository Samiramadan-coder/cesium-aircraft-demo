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

/**
 * What the map accepts. Any data source (mock, WebSocket, ...) only has to
 * produce this shape. `timestamp` defaults to "now"; `pitch` / `roll`
 * (degrees) are optional and default to level flight.
 */
export type AircraftPositionUpdate = Omit<AircraftPosition, "timestamp"> & {
  timestamp?: number;
  pitch?: number;
  roll?: number;
};

export type CameraMode = "follow" | "free";

export type AircraftMapApi = {
  updateAircraftPosition: (update: AircraftPositionUpdate) => void;
  resetCamera: () => void;
};
