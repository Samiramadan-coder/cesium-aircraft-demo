import "server-only";

import { cache } from "react";
import { api } from "@/lib/api/client";
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

export const getFleetHours = cache(() =>
  api.get<FleetHours>("/v1/tracking/hours/fleet"),
);

export const getAircraftProfiles = cache(() =>
  api.get<TrackedAircraft[]>("/v1/aircraft"),
);

export const getPilots = cache(() => api.get<TrackedPilot[]>("/v1/pilots"));

export const getPilotHours = () =>
  api.get<PilotHours[]>("/v1/tracking/hours/pilots");

export const getDailyLog = () =>
  api.get<DailyLogEntry[]>("/v1/tracking/hours/daily-log");

export const getMaintenanceRecords = () =>
  api.get<MaintenanceRecord[]>("/v1/tracking/maintenance");

/** Fleet hours, each merged with its aircraft profile. */
export const getFleet = cache(async (): Promise<FleetAircraft[]> => {
  const [fleet, profiles] = await Promise.all([
    getFleetHours(),
    getAircraftProfiles(),
  ]);
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));

  return fleet.aircraft.map((item) => ({
    ...item,
    profile: byId.get(item.aircraftId) ?? null,
  }));
});

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
