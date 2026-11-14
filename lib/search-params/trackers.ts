import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";
import type { TrackerStatus } from "@/types/trackers";

export const TRACKER_STATUSES = [
  "online",
  "offline",
  "notInstalled",
] as const satisfies readonly TrackerStatus[];

/** Query params of `GET /v1/tracking/trackers`; missing means no filter. */
export const trackersSearchParams = {
  status: parseAsStringLiteral(TRACKER_STATUSES),
  model: parseAsString,
  /** SIM operator, e.g. "du", "e&" */
  operator: parseAsString,
  /** Aircraft slug */
  aircraftId: parseAsString,
  /** IMEI, serial or aircraft */
  search: parseAsString.withDefault(""),
};

export const loadTrackersSearchParams = createLoader(trackersSearchParams);
