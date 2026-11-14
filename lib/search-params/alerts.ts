import {
  createLoader,
  parseAsBoolean,
  parseAsInteger,
  parseAsIsoDate,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

/** `?severity=` values accepted by `GET /v1/tracking/alerts`. */
export const ALERT_SEVERITIES = ["critical", "warning", "info"] as const;

export const ALERT_STATUSES = ["open", "acknowledged", "resolved"] as const;

export const ALERT_TYPES = [
  "nearBoundary",
  "outsideZone",
  "nearCeiling",
  "ceilingExceeded",
  "signalLost",
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export const alertsSearchParams = {
  severity: parseAsStringLiteral(ALERT_SEVERITIES),
  status: parseAsStringLiteral(ALERT_STATUSES),
  type: parseAsStringLiteral(ALERT_TYPES),
  /** Aircraft slug */
  aircraftId: parseAsString,
  /** Only alerts that haven't ended yet */
  activeOnly: parseAsBoolean.withDefault(false),
  /** First day, inclusive */
  from: parseAsIsoDate,
  /** Last day, inclusive */
  to: parseAsIsoDate,
  /** Aircraft, pilot or flight id */
  search: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

export const loadAlertsSearchParams = createLoader(alertsSearchParams);

export type AlertsFilters = Awaited<ReturnType<typeof loadAlertsSearchParams>>;

/** The API query for the alerts list; the days become epoch ms bounds. */
export function toAlertsQuery({
  from,
  to,
  search,
  activeOnly,
  page,
  ...rest
}: AlertsFilters) {
  return {
    ...rest,
    activeOnly: activeOnly || undefined,
    from: from ? from.getTime() : undefined,
    // The end of the last day.
    to: to ? to.getTime() + DAY_MS - 1 : undefined,
    search: search || undefined,
    page: page > 1 ? page : undefined,
  };
}

/** Whether anything narrows the list. */
export function hasAlertFilters({ page, search, activeOnly, ...rest }: AlertsFilters) {
  void page;
  return (
    !!search ||
    activeOnly ||
    Object.values(rest).some((value) => value != null)
  );
}
