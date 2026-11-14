import "server-only";

import { cache } from "react";
import { api } from "@/lib/api/client";
import type { PeriodArgs } from "@/lib/search-params/engine-hours";
import type {
  DailyLogEntry,
  FleetAircraft,
  FleetHours,
  MaintenanceAircraftOption,
  MaintenanceRecord,
  PilotHours,
} from "@/types/engine-flight-hours";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";

// Wrapped in `cache` so the layout and the page share one request each
// instead of fetching the same endpoint twice per render.

const periodQuery = (...[period, from, to]: Partial<PeriodArgs>) => ({
  period,
  from,
  to,
});

export const getFleetHours = cache((...args: Partial<PeriodArgs>) =>
  api.get<FleetHours>("/v1/tracking/hours/fleet", {
    query: periodQuery(...args),
  }),
);

export const getAircraftProfiles = cache(() =>
  api.get<TrackedAircraft[]>("/v1/aircraft"),
);

export const getPilots = cache(() => api.get<TrackedPilot[]>("/v1/pilots"));

export const getPilotHours = (...args: Partial<PeriodArgs>) =>
  api.get<PilotHours[]>("/v1/tracking/hours/pilots", {
    query: periodQuery(...args),
  });

export const getDailyLog = (
  { search }: { search?: string },
  ...args: Partial<PeriodArgs>
) =>
  api.get<DailyLogEntry[]>("/v1/tracking/hours/daily-log", {
    query: { ...periodQuery(...args), search: search || undefined },
  });

export const getMaintenanceRecords = (
  filters: { aircraftId?: string | null; type?: string | null } = {},
) =>
  api.get<MaintenanceRecord[]>("/v1/tracking/maintenance", {
    query: filters,
  });

/** Fleet hours, each merged with its aircraft profile. */
export const getFleet = cache(
  async (...args: Partial<PeriodArgs>): Promise<FleetAircraft[]> => {
    const [fleet, profiles] = await Promise.all([
      getFleetHours(...args),
      getAircraftProfiles(),
    ]);
    const byId = new Map(profiles.map((profile) => [profile.id, profile]));

    return fleet.aircraft.map((item) => ({
      ...item,
      profile: byId.get(item.aircraftId) ?? null,
    }));
  },
);

/** The aircraft offered in the "Log maintenance" dialog. */
export function toMaintenanceAircraft(
  fleet: FleetAircraft[],
): MaintenanceAircraftOption[] {
  return fleet.map((item) => ({
    id: item.aircraftId,
    registration: item.profile?.registration ?? item.aircraftId,
    name: item.profile?.name ?? null,
    lifetimeHours: item.lifetimeHours,
  }));
}
