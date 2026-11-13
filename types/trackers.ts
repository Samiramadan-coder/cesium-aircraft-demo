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
};
