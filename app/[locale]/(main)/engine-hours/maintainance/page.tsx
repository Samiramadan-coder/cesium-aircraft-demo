import { api } from "@/lib/api/client";
import type { MaintenanceRecord } from "@/types/engine-flight-hours";
import type { TrackedAircraft } from "@/types/tracking";
import DataPreview from "@/components/engine-flight-hours/maintainance/data-preview";

export default async function Page() {
  const [records, aircraft] = await Promise.all([
    api.get<MaintenanceRecord[]>("/v1/tracking/maintenance"),
    api.get<TrackedAircraft[]>("/v1/aircraft"),
  ]);

  return <DataPreview records={records} aircraft={aircraft} />;
}
