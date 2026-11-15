import type { Alert, AlertChannel } from "./alerts";

export type LatLon = {
  lat: number;
  lon: number;
};

export type TrackedAircraft = {
  id: string;
  registration: string;
  name: string;
  nameAr: string | null;
  type: string;
  photoUrl: string | null;
  pilotId: string | null;
  color: string;
  serviceIntervalHours: number;
  active: boolean;
  trackerId: string | null;
};

export type TrackedPilot = {
  id: string;
  name: string;
  nameAr: string | null;
  initials: string;
  licenseNumber: string | null;
  phone: string | null;
  active: boolean;
};

export type TrackedPosition = {
  aircraftId: string;
  /** Unix epoch, milliseconds */
  time: number;
  lat: number;
  lon: number;
  altitudeFt: number;
  heightAglFt: number;
  groundSpeedKt: number;
  headingDeg: number;
  verticalSpeedFpm: number;
  verticalTrend: string;
  engineOn: boolean;
  signalStrength: number;
  batteryPercent: number | null;
  status: string;
  statusSince: number;
  distanceToBoundaryNm: number | null;
  marginToCeilingFt: number;
  insideZoneId: string | null;
  isLastKnown: boolean;
  flightId: string | null;
  flightState: string | null;
  pilotId: string | null;
};

export type TrackedZone = {
  id: string;
  name: string;
  nameAr: string | null;
  kind: string;
  type: "polygon" | "circle";
  color: string;
  /** Outline of a polygon zone; null for a circle. */
  points: LatLon[] | null;
  /** Areas cut out of a polygon zone. */
  holes: LatLon[][] | null;
  /** Centre of a circle zone; null for a polygon. */
  center: LatLon | null;
  radiusMeters: number | null;
  ceilingFt: number;
  ceilingReference: string;
  floorFt: number;
  lateralWarningBufferNm: number;
  altitudeWarningMarginFt: number;
  active: boolean;
  appliesTo: string;
  notes: string | null;
  lastEditedBy: string;
  lastEditedAt: string;
};

export type LiveTrackingSnapshot = {
  /** Unix epoch, milliseconds */
  serverTime: number;
  aircraft: TrackedAircraft[];
  pilots: TrackedPilot[];
  positions: TrackedPosition[];
  activeAlerts: Alert[];
  zones: TrackedZone[];
  settings: TrackingSettings;
  aerodrome: Aerodrome;
  kpis: LiveTrackingKpis;
};

export type LiveTrackingKpis = {
  aircraftAirborne: number;
  activeAlerts: number;
};

/**
 * Body of `POST /v1/tracking/zones` and `PATCH /v1/tracking/zones/{id}`.
 * A polygon sends `points` (and keeps its `holes`); a circle sends `center`
 * and `radiusMeters`. `summary` describes the change in the version history.
 */
export type ZonePayload = {
  name: string;
  nameAr: string | null;
  type: "polygon" | "circle";
  kind: string;
  color: string;
  points?: LatLon[];
  holes?: LatLon[][];
  center?: LatLon;
  radiusMeters?: number;
  ceilingFt: number;
  ceilingReference: string;
  floorFt: number;
  lateralWarningBufferNm: number;
  altitudeWarningMarginFt: number;
  active: boolean;
  appliesTo: string;
  notes: string | null;
  summary: string;
};

/** The zone as it was saved in one version. */
export type ZoneSnapshot = Omit<TrackedZone, "lastEditedBy" | "lastEditedAt">;

/** One entry of `GET /v1/tracking/zones/{zone}/versions`. */
export type ZoneVersion = {
  id: string;
  /** ISO date-time */
  date: string;
  user: string;
  summary: string;
  snapshot: ZoneSnapshot;
};

/** A point's position from the reference airport, e.g. P1 at 345° / 3.95 NM. */
export type ZoneBearing = {
  /** "P1", "P2", … for a polygon; "Center" for a circle. */
  label: string;
  distanceNm: number;
  /** True bearing from the reference, 0–359. */
  bearingDeg: number;
};

/** `GET /v1/tracking/zones/{zone}/computed`: measurements of the saved zone. */
export type ZoneComputed = {
  areaNm2: number;
  /** Longest distance across the zone (a circle's diameter). */
  maxExtentNm: number;
  /** Polygon points; 0 for a circle. */
  vertices: number;
  /** ICAO code of the airport the bearings are measured from, e.g. "OMEF". */
  reference: string;
  bearings: ZoneBearing[];
};

/** `GET /v1/tracking/settings`: club-wide tracking settings. */
export type TrackingSettings = {
  aerodromeElevationFt: number;
  /** No position for this long marks the aircraft's signal as lost. */
  signalLossTimeoutSec: number;
  /** Ground speed above which a flight is considered started. */
  flightDetectionSpeedKt: number;
  engineDetectionMethod: string;
  dataRetentionMonths: number;
  alertRecipients: AlertChannel[];
};

/** Body of `PUT /v1/tracking/settings`: the fields editable here. */
export type TrackingSettingsPayload = Pick<
  TrackingSettings,
  "signalLossTimeoutSec" | "flightDetectionSpeedKt" | "alertRecipients"
>;

/** `GET /v1/aerodrome`: the club's home aerodrome. */
export type Aerodrome = {
  icao: string;
  name: string;
  /** Where bearings and distances are measured from. */
  referencePoint: LatLon;
  elevationFt: number;
  runwayThresholds: { designator: string; threshold: LatLon }[];
  /** The circuit (traffic pattern) flown around the runway. */
  circuitPattern: LatLon[];
  runwayHeadingDeg: number;
};

/** Body of `PUT /v1/aerodrome`. */
export type AerodromePayload = Pick<Aerodrome, "name">;
