import {
  createLoader,
  parseAsIsoDate,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import { SERVICE_TYPES } from "@/components/engine-flight-hours/maintenance/service-types";

/** `?period=` values accepted by the `/tracking/hours/*` endpoints. */
export const PERIODS = ["week", "month", "last30", "all", "custom"] as const;
export type Period = (typeof PERIODS)[number];

/** The API's own default, so it's left out of the URL. */
export const DEFAULT_PERIOD: Period = "month";

/** Shared by every tab: the KPIs and the hours tables follow it. */
export const periodParams = {
  period: parseAsStringLiteral(PERIODS).withDefault(DEFAULT_PERIOD),
  // Only used with `period=custom`.
  from: parseAsIsoDate,
  to: parseAsIsoDate,
};

export const dailyLogParams = {
  ...periodParams,
  search: parseAsString.withDefault(""),
};

export const maintenanceParams = {
  ...periodParams,
  aircraftId: parseAsString,
  type: parseAsStringLiteral(SERVICE_TYPES),
};

export const loadPeriodParams = createLoader(periodParams);
export const loadDailyLogParams = createLoader(dailyLogParams);
export const loadMaintenanceParams = createLoader(maintenanceParams);

/** YYYY-MM-DD, as `parseAsIsoDate` reads it (UTC). */
export const toIsoDay = (date: Date) => date.toISOString().slice(0, 10);

/**
 * `[period, from, to]` for the data functions (primitives, so React's
 * `cache` dedupes them). A custom range missing either end falls back to
 * the default period instead of sending a half range.
 */
export type PeriodArgs = [period: Period, from?: string, to?: string];

export function toPeriodArgs({
  period,
  from,
  to,
}: {
  period: Period;
  from: Date | null;
  to: Date | null;
}): PeriodArgs {
  if (period !== "custom") return [period];
  if (!from || !to) return [DEFAULT_PERIOD];
  return ["custom", toIsoDay(from), toIsoDay(to)];
}
