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
  /** The flight in progress or last flown, e.g. "fl-0143". */
  flightId?: string | null;
};

/** A past position of an aircraft, for drawing its route. */
export type AircraftTrailPoint = {
  lat: number;
  lng: number;
  /** Feet, same reference as `AircraftPosition.altitude` */
  altitude: number;
  /** Unix epoch, milliseconds */
  timestamp: number;
  /** Tracking status at that point, colors the route; null if unknown. */
  status: string | null;
};

/** Something that happened to an aircraft, e.g. a takeoff. */
export type AircraftEvent = {
  id: string;
  aircraftId: string;
  /** "takeoff", "landing", "statusChanged", … */
  type: string;
  flightId: string | null;
  /** Unix epoch, milliseconds */
  timestamp: number;
  /** For "statusChanged": the statuses before and after. */
  from?: string;
  to?: string;
};

/** A labelled point drawn on the map, e.g. where an aircraft took off. */
export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  /** Feet */
  altitude: number;
  label: string;
  /** CSS color */
  color: string;
};

/** The home aerodrome, drawn on the map. */
export type AirfieldLayout = {
  icao: string;
  referencePoint: { lat: number; lng: number };
  /** Aerodrome elevation, feet above mean sea level. */
  elevationFt: number;
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
  /** Feet per minute, positive climbing; used to tilt the nose. */
  verticalSpeed?: number;
  /** On the ground: drawn on the runway surface, level. */
  onGround?: boolean;
  /** Degrees; derived from the climb rate when omitted. */
  pitch?: number;
  /** Degrees, right wing down positive; derived from the turn rate when omitted. */
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
  /** Backend clock minus this computer's, ms, so "now" matches the data. */
  setClockOffset: (offsetMs: number) => void;
  updateAircraft: (update: AircraftUpdate) => void;
  removeAircraft: (id: string) => void;
  /** Replaces the drawn route history of one aircraft. */
  setTrail: (id: string, points: AircraftTrailPoint[]) => void;
  /**
   * Where an aircraft's live path begins: its flight's start (Unix ms), null
   * when it isn't flying (no path), undefined when unknown (the last hour).
   */
  setFlightStart: (id: string, startMs: number | null | undefined) => void;
  /** Replaces all markers. */
  setMarkers: (markers: MapMarker[]) => void;
  /** Flies the camera to look at a point. */
  flyTo: (point: { lat: number; lng: number; altitude: number }) => void;
  resetCamera: () => void;
  /** Zooms and/or turns the view, in button steps (eased). */
  nudgeCamera: (nudge: CameraNudge) => void;
};

/** zoom: steps in (+) or out (-); rotate: steps right (+) or left (-). */
export type CameraNudge = { zoom?: number; rotate?: number };
