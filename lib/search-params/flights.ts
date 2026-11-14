import {
  createLoader,
  parseAsInteger,
  parseAsIsoDate,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import { toIsoDay } from "./engine-hours";

/** `?range=` values accepted by `GET /v1/tracking/flights`. */
export const FLIGHT_RANGES = [
  "today",
  "last7",
  "last30",
  "week",
  "month",
  "all",
  "custom",
] as const;
export type FlightRange = (typeof FLIGHT_RANGES)[number];

/** The API's own default, so it's left out of the URL. */
export const DEFAULT_FLIGHT_RANGE: FlightRange = "last30";

export const AIRCRAFT_TYPES = [
  "Light Sport Aircraft",
  "Gyrocopter",
  "Paramotor",
] as const;

export const FLIGHT_TYPES = [
  "trial",
  "training",
  "rental",
  "checkride",
  "groundRun",
] as const;

/** The filter's values; the flight itself reports `warnings` (plural). */
export const COMPLIANCE_FILTERS = ["compliant", "warning", "violation"] as const;

export const flightsSearchParams = {
  range: parseAsStringLiteral(FLIGHT_RANGES).withDefault(DEFAULT_FLIGHT_RANGE),
  // Only used with `range=custom`.
  from: parseAsIsoDate,
  to: parseAsIsoDate,
  /** Aircraft slug */
  aircraftId: parseAsString,
  aircraftType: parseAsStringLiteral(AIRCRAFT_TYPES),
  /** Pilot slug */
  pilotId: parseAsString,
  flightType: parseAsStringLiteral(FLIGHT_TYPES),
  compliance: parseAsStringLiteral(COMPLIANCE_FILTERS),
  /** Aircraft, pilot, booking ref or flight id */
  search: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

export const loadFlightsSearchParams = createLoader(flightsSearchParams);

export type FlightsFilters = Awaited<ReturnType<typeof loadFlightsSearchParams>>;

/**
 * The API query for the flights list. A custom range missing either end
 * falls back to the default range instead of sending a half range.
 */
export function toFlightsQuery({ range, from, to, search, page, ...rest }: FlightsFilters) {
  const custom = range === "custom" && from && to;
  return {
    ...rest,
    range: custom ? range : range === "custom" ? DEFAULT_FLIGHT_RANGE : range,
    from: custom ? toIsoDay(from) : undefined,
    to: custom ? toIsoDay(to) : undefined,
    search: search || undefined,
    page: page > 1 ? page : undefined,
  };
}

/** Whether anything narrows the list beyond the default range. */
export function hasFlightFilters({ range, page, search, ...rest }: FlightsFilters) {
  void page;
  return (
    range !== DEFAULT_FLIGHT_RANGE ||
    !!search ||
    Object.values(rest).some((value) => value != null)
  );
}
