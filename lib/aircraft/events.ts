import type { AircraftEvent, AircraftTrailPoint } from "@/types/aircraft";

/** An event further than this from every trail point has no known position. */
const MAX_POSITION_OFFSET_MS = 30_000;

const WARNING_STATUSES = new Set([
  "nearBoundary",
  "nearCeiling",
  "atzAltitudeWarning",
]);
const VIOLATION_STATUSES = new Set(["ceilingExceeded", "outsideZone"]);

const STATUS_COLORS: Record<string, string> = {
  normal: "#34d399",
  onGround: "#38bdf8",
  signalLost: "#a1a1aa",
};

const EVENT_COLORS: Record<string, string> = {
  takeoff: "#34d399",
  landing: "#38bdf8",
  engineStart: "#a1a1aa",
  engineShutdown: "#a1a1aa",
  signalLost: "#f87171",
  signalRestored: "#34d399",
};

/** CSS color of an event, for the list dot and the map marker. */
export function eventColor(event: AircraftEvent): string {
  if (event.type === "statusChanged" && event.to) {
    if (VIOLATION_STATUSES.has(event.to)) return "#f87171";
    if (WARNING_STATUSES.has(event.to)) return "#fbbf24";
    return STATUS_COLORS[event.to] ?? "#a1a1aa";
  }
  return EVENT_COLORS[event.type] ?? "#a1a1aa";
}

/**
 * Whether the event is worth a marker on the map: takeoffs, landings, lost
 * signal and warnings. Engine and back-to-normal changes are list-only.
 */
export function isMapEvent(event: AircraftEvent): boolean {
  if (event.type === "statusChanged") {
    return (
      event.to !== undefined &&
      (WARNING_STATUSES.has(event.to) || VIOLATION_STATUSES.has(event.to))
    );
  }
  return ["takeoff", "landing", "signalLost"].includes(event.type);
}

/** The trail point closest in time to `timestamp`, if one is close enough. */
export function findTrailPoint(
  trail: AircraftTrailPoint[],
  timestamp: number,
): AircraftTrailPoint | undefined {
  if (trail.length === 0) return undefined;
  // Binary search: the trail is in time order.
  let low = 0;
  let high = trail.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (trail[mid].timestamp < timestamp) low = mid + 1;
    else high = mid;
  }
  const candidates = [trail[low - 1], trail[low]].filter(Boolean);
  const closest = candidates.reduce((best, point) =>
    Math.abs(point.timestamp - timestamp) < Math.abs(best.timestamp - timestamp)
      ? point
      : best,
  );
  return Math.abs(closest.timestamp - timestamp) <= MAX_POSITION_OFFSET_MS
    ? closest
    : undefined;
}

/**
 * When the aircraft last took off, if it hasn't landed since; null when it
 * is on the ground or the events don't say. `events` must be oldest first.
 */
export function airborneSince(events: AircraftEvent[]): number | null {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === "landing") return null;
    if (events[i].type === "takeoff") return events[i].timestamp;
  }
  return null;
}
