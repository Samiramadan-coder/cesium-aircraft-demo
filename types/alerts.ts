// GET /v1/tracking/alerts/kpis
export type KPIS = {
  open: number;
  criticalOpen: number;
  triggeredToday: number;
  /** null until an alert has been acknowledged */
  avgTimeToAcknowledgeSec: number | null;
  /** null until an alert has been resolved */
  avgTimeToResolveSec: number | null;
};

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";

/** A staff member; the API may send just the name. */
export type AlertUser = string | { id: string | number; name: string };

// GET /v1/tracking/alerts (paginated)
export type Alert = {
  id: string;
  /** e.g. "ceilingExceeded", "outsideZone", "signalLost", "nearBoundary" */
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  aircraftId: string;
  pilotId: string | null;
  zoneId: string | null;
  flightId: string | null;
  /** Unix epoch, milliseconds */
  triggeredAt: number;
  /** Unix epoch, milliseconds; null while active */
  endedAt: number | null;
  isActive: boolean;
  durationSec: number | null;
  lat: number;
  lon: number;
  altitudeFt: number | null;
  /** Negative when outside the zone */
  distanceToBoundaryNm: number | null;
  /** Negative when above the ceiling */
  marginToCeilingFt: number | null;
  /** Side of the zone it crossed, e.g. "S" */
  boundarySide: string | null;
  /** e.g. "1.1 NM E of OMEF" */
  location: string | null;
  assignedTo: AlertUser | null;
  /** Unix epoch, milliseconds */
  acknowledgedAt: number | null;
  acknowledgedBy: AlertUser | null;
  acknowledgedNote: string | null;
  /** Unix epoch, milliseconds */
  resolvedAt: number | null;
  resolvedBy: AlertUser | null;
  /** e.g. "falseAlarm" */
  resolution: string | null;
  resolutionNote: string | null;
};

/**
 * `resolution` values for `POST …/resolve`. Only `pilotCorrected` is
 * confirmed by the API docs; `falseAlarm` matches the design.
 */
export const ALERT_RESOLUTIONS = ["pilotCorrected", "falseAlarm"] as const;
export type AlertResolution = (typeof ALERT_RESOLUTIONS)[number];

// POST /v1/tracking/alerts/{id}/acknowledge
export type AcknowledgeAlertPayload = { note?: string };

// POST /v1/tracking/alerts/{id}/assign
export type AssignAlertPayload = { userId: number };

// POST /v1/tracking/alerts/{id}/resolve
export type ResolveAlertPayload = {
  resolution: AlertResolution;
  note?: string;
};

/** Where a rule's alerts are sent: the ops console, SMS or email. */
export const ALERT_CHANNELS = ["operations", "sms", "email"] as const;
export type AlertChannel = (typeof ALERT_CHANNELS)[number];

// GET /v1/tracking/alert-rules
export type AlertRule = {
  /** e.g. "rule-near-boundary" */
  id: string;
  /** The alert type it raises, e.g. "nearBoundary" */
  type: string;
  enabled: boolean;
  severity: AlertSeverity;
  /** Depends on the type; `[]` when it has none. */
  threshold: {
    lateralBufferNm?: number;
    altitudeMarginFt?: number;
    ceilingFt?: number;
    timeoutSec?: number;
  } | [];
  sound: boolean;
  toast: boolean;
  channels: AlertChannel[];
};

// PUT /v1/tracking/alert-rules/{id}
export type AlertRulePayload = Pick<
  AlertRule,
  "enabled" | "severity" | "sound" | "toast" | "channels"
>;
