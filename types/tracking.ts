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
  activeAlerts: unknown[];
  zones: TrackedZone[];
};
