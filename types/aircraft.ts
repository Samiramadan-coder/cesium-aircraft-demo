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

/** Tracking data the backend computes per position, shown in the info panel. */
export type AircraftDetails = {
  /** e.g. "Gyrocopter" */
  type?: string;
  photoUrl?: string | null;
  pilotName?: string | null;
  /** e.g. "onGround", "normal", "nearCeiling", "signalLost" */
  status?: string;
  /** Height above the aerodrome, feet */
  heightAglFt?: number;
  verticalSpeedFpm?: number;
  /** Positive inside the zone, negative outside; null when unknown. */
  distanceToBoundaryNm?: number | null;
  /** 0–100 */
  signalStrength?: number | null;
  /** 0–100 */
  batteryPercent?: number | null;
  engineOn?: boolean;
  /** e.g. "Teltonika FMC650" */
  trackerModel?: string | null;
};

/** The home aerodrome, drawn on the map. */
export type AirfieldLayout = {
  icao: string;
  referencePoint: { lat: number; lng: number };
  /** Runway ends, e.g. "15" and "33". */
  runwayThresholds: Array<{
    designator: string;
    threshold: { lat: number; lng: number };
  }>;
  /** The traffic pattern flown around the runway. */
  circuitPattern: Array<{ lat: number; lng: number }>;
};

export type Aircraft = {
  /** Stable identity, e.g. the tracker device id */
  id: string;
  name: string;
  callsign?: string;
  details?: AircraftDetails;
  /** glTF / GLB to render this aircraft with; the default model if omitted. */
  modelUrl?: string;
  /** Multiplies the model's size; overrides the model's own default scale. */
  modelScale?: number;
  currentPosition: AircraftPosition;
};

/**
 * One tracking update for one aircraft. Any data source (mock, WebSocket,
 * ...) only has to produce this shape. An unknown `id` creates the aircraft.
 * `timestamp` defaults to "now"; `pitch` / `roll` (degrees) are optional and
 * default to level flight. `modelUrl` / `modelScale` choose how the aircraft
 * looks and may change at any time.
 */
export type AircraftUpdate = Omit<AircraftPosition, "timestamp"> & {
  id: string;
  name?: string;
  callsign?: string;
  /** Replaces the previous details when present. */
  details?: AircraftDetails;
  modelUrl?: string;
  modelScale?: number;
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
  /** Areas cut out of the polygon, same format as `coordinates`. */
  holes?: Array<
    Array<{
      lat: number;
      lng: number;
    }>
  >;
  /** CSS color; overrides the color of `type`. */
  color?: string;
  /** How close to the edge counts as "approaching"; a default if omitted. */
  warningDistanceMeters?: number;
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
  "outside" | "approaching" | "inside" | "above" | "below";

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
