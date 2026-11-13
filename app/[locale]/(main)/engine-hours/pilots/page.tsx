import { api } from "@/lib/api/client";
import type { PilotHours } from "@/types/engine-flight-hours";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";
import DataPreview from "@/components/engine-flight-hours/pilots/data-preview";

export default async function Page() {
  const [hours, pilots, aircraft] = await Promise.all([
    api.get<PilotHours[]>("/v1/tracking/hours/pilots"),
    api.get<TrackedPilot[]>("/v1/pilots"),
    api.get<TrackedAircraft[]>("/v1/aircraft"),
  ]);

  return <DataPreview hours={hours} pilots={pilots} aircraft={aircraft} />;
}
