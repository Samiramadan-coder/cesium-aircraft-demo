// GET /v1/tracking/trackers
// TODO: field names are inferred from the design; confirm against the API.
export type TrackerStatus = "online" | "offline" | "notInstalled";

export type Tracker = {
  id: string;
  /** e.g. "Teltonika FMC650" */
  model: string;
  imei: string;
  aircraftId: string | null;
  /** SIM operator, e.g. "e&", "du" */
  simCarrier: string | null;
  simNumber: string | null;
  status: TrackerStatus;
  /** Epoch ms of the last report */
  lastSeenAt: number | null;
  /** 0–100 */
  signalStrength: number | null;
  /** 0–100 */
  batteryPercent: number | null;
  firmware: string | null;
};

export type KPIS = {
  avgBattery: number;
  avgSignal: number;
  firmwareOutdated: number;
  notInstalled: number;
  offline: number;
  online: number;
  total: number;
};

// POST /v1/tracking/trackers
export type TrackerPayload = {
  imei: string;
  model: string;
  serial: string;
  /** SIM operator, e.g. "du" */
  sim: string;
  simNumber: string;
  apn: string;
  powerSource: string;
  engineInput: string;
  installedBy: string;
  registerInTraccar: boolean;
};

// GET /v1/tracking/trackers/{tracker}
// TODO: field names are inferred from the design; confirm against the API.
export type TrackerDetails = {
  id: string;
  model: string;
  imei: string;
  serial: string | null;
  status: TrackerStatus;
  lastSeenAt: number | null;
  firmware: string | null;
  latestFirmware: string | null;
  aircraftId: string | null;
  /** Epoch ms or a date string — the API format is not confirmed yet */
  installedAt: number | string | null;
  installedBy: string | null;
  /** SIM operator, e.g. "e&" */
  sim: string | null;
  simNumber: string | null;
  apn: string | null;

  // Live status — TODO: confirm names against the API.
  /** 0–100 */
  signalStrength: number | null;
  /** 0–100 */
  batteryPercent: number | null;
  /** Volts */
  powerVoltage: number | null;
  /** "aircraft" | "internal" */
  powerSource: string | null;
  engineOn: boolean | null;
  lastPosition: { lat: number; lon: number } | null;
  gpsSatellites: number | null;
  /** Meters */
  gpsAccuracyM: number | null;

  // Configuration — TODO: confirm names against the API.
  serverHost: string | null;
  serverPort: number | null;
  /** Seconds between reports while airborne */
  intervalInFlightS: number | null;
  /** Seconds between reports on the ground */
  intervalOnGroundS: number | null;
  /** Degrees of heading change that force a report */
  angleTriggerDeg: number | null;
  /** Meters travelled that force a report */
  distanceTriggerM: number | null;
  /** "ignition" | "motion" — same values as the add-tracker payload */
  engineInput: string | null;
};

// GET /v1/tracking/trackers/{tracker}/health
// TODO: field names are inferred from the design; confirm against the API.
export type HealthPoint = {
  /** Epoch ms or a date string */
  time: number | string;
  /** 0–100 */
  value: number;
};

export type ConnectionEvent = {
  type: "connected" | "disconnected";
  /** Epoch ms or a date string */
  time: number | string;
};

export type TrackerHealth = {
  /** Last 24h */
  signalHistory: HealthPoint[];
  /** Last 24h */
  batteryHistory: HealthPoint[];
  connectionEvents: ConnectionEvent[];
};

// POST /v1/tracking/trackers/{tracker}/firmware/check
// TODO: field names are guessed; confirm against the API.
export type FirmwareCheck = {
  currentVersion: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
};

// POST /v1/tracking/trackers/{tracker}/link
export type TrackerLinkPayload = {
  aircraftId: string;
  installedBy: string;
};
