export type TrackerStatus = "online" | "offline" | "notInstalled";

// GET /v1/tracking/trackers (list) — the details endpoint returns the same
// shape plus `connectionEvents`.
export type Tracker = {
  id: string;
  aircraftId: string | null;
  traccarDeviceId: number | null;
  /** e.g. "Teltonika FMC650" */
  model: string;
  imei: string;
  serial: string | null;
  /** SIM operator, e.g. "e&", "du" */
  sim: string | null;
  simNumber: string | null;
  apn: string | null;
  firmware: string | null;
  firmwareLatest: string | null;
  status: TrackerStatus;
  /** Seconds since the last report */
  lastSeenSec: number | null;
  /** ISO date */
  lastSeenAt: string | null;

  // Live status
  /** 0–100 */
  signalStrength: number | null;
  /** 0–100 */
  batteryPercent: number | null;
  /** "aircraft" | "internal" */
  powerSource: string | null;
  /** Volts */
  powerVoltage: number | null;
  /** "ignition" | "motion" */
  engineInput: string | null;
  engineOn: boolean | null;
  gpsSatellites: number | null;
  gpsAccuracyM: number | null;
  lastPosition: { lat: number; lon: number } | null;

  // Installation
  /** ISO date */
  installedAt: string | null;
  installedBy: string | null;

  // Configuration
  serverAddress: string | null;
  serverPort: number | null;
  reportingIntervalFlightSec: number | null;
  reportingIntervalGroundSec: number | null;
  angleTriggerDeg: number | null;
  distanceTriggerM: number | null;
};

// TODO: the API has only returned an empty list so far; shape is guessed.
export type ConnectionEvent = {
  type: "connected" | "disconnected";
  /** Epoch ms or a date string */
  time: number | string;
};

// GET /v1/tracking/trackers/{tracker}
export type TrackerDetails = Tracker & {
  connectionEvents: ConnectionEvent[];
};

// GET /v1/tracking/trackers/kpis
export type KPIS = {
  avgBattery: number;
  avgSignal: number;
  firmwareOutdated: number;
  notInstalled: number;
  offline: number;
  online: number;
  total: number;
};

// GET /v1/tracking/trackers/{tracker}/health — one point per hour, last 24h
export type HealthPoint = {
  hoursAgo: number;
  /** 0–100 */
  signalStrength: number | null;
  /** 0–100 */
  batteryPercent: number | null;
};

// GET /v1/firmware-versions — the latest release per tracker model
export type FirmwareVersion = {
  id: string;
  model: string;
  latestVersion: string;
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

// POST /v1/tracking/trackers/{tracker}/firmware/check
// TODO: response shape is guessed; not called yet against the real API.
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

// POST /v1/firmware-versions
export type FirmwareVersionPayload = {
  model: string;
  latestVersion: string;
};
