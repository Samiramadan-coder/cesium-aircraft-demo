import type {
  AirCraft,
  MaintenanceAircraftOption,
} from "@/types/engine-flight-hours";
import type { TrackedAircraft } from "@/types/tracking";

// Matches the keys in `EngineHours.details.serviceTypes`.
export const SERVICE_TYPES = ["50h", "100h", "oilChange", "annual"] as const;

/** Builds the dialog's aircraft list from fleet hours + aircraft profiles. */
export function toMaintenanceAircraft(
  fleet: AirCraft[],
  profiles: TrackedAircraft[],
): MaintenanceAircraftOption[] {
  return fleet.map((item) => {
    const profile = profiles.find((p) => p.id === item.aircraftId);
    return {
      id: item.aircraftId,
      registration: profile?.registration ?? item.aircraftId,
      name: profile?.name ?? null,
      lifetimeHours: item.lifetimeHours,
    };
  });
}
