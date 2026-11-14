import "server-only";

import { notFound } from "next/navigation";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type {
  Flight,
  FlightEvents,
  FlightReplay,
  FlightsSummary,
  KPIS,
  Paginated,
} from "@/types/flights";
import type { TrackedZone } from "@/types/tracking";
import type { toFlightsQuery } from "@/lib/search-params/flights";

const flightPath = (id: string) =>
  `/v1/tracking/flights/${encodeURIComponent(id)}`;

export const getFlightKpis = () => api.get<KPIS>("/v1/tracking/flights/kpis");

export const getFlights = (query?: ReturnType<typeof toFlightsQuery>) =>
  api.get<Paginated<Flight>>("/v1/tracking/flights", { query });

export const getFlightsSummary = () =>
  api.get<FlightsSummary>("/v1/tracking/flights/summary");

/** The flight and its track. An unknown id renders the route's `not-found`. */
export async function getFlightReplay(id: string) {
  try {
    return await api.get<FlightReplay>(`${flightPath(id)}/replay`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export const getFlightEvents = (id: string) =>
  api.get<FlightEvents>(`${flightPath(id)}/events`);

export const getZones = () => api.get<TrackedZone[]>("/v1/tracking/zones");

/** The highest ceiling among the active zones: the altitude chart's dashed line. */
export function highestCeilingFt(zones: TrackedZone[]) {
  const ceilings = zones
    .filter((zone) => zone.active)
    .map((zone) => zone.ceilingFt);
  return ceilings.length > 0 ? Math.max(...ceilings) : undefined;
}
