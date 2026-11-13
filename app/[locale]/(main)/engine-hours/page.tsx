import { api } from "@/lib/api/client";
import { navPageMetadata } from "@/lib/page-metadata";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";
import type { AirCraft, FleetAircraft } from "@/types/engine-flight-hours";
import DataPreview from "@/components/engine-flight-hours/fleet/data-preview";

export const generateMetadata = navPageMetadata("engineHours");

export default async function Page() {
  const [fleet, profiles, pilots] = await Promise.all([
    api.get<{ aircraft: AirCraft[] }>("/v1/tracking/hours/fleet"),
    api.get<TrackedAircraft[]>("/v1/aircraft"),
    api.get<TrackedPilot[]>("/v1/pilots"),
  ]);

  // console.log(pilots);

  const aircraft: FleetAircraft[] = fleet.aircraft.map((item) => ({
    ...item,
    profile: profiles.find((profile) => profile.id === item.aircraftId) ?? null,
  }));

  return <DataPreview aircraft={aircraft} pilots={pilots} />;
}
