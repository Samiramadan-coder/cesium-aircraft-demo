import {
  getAircraftProfiles,
  getMaintenanceRecords,
} from "@/lib/data/engine-hours";
import DataPreview from "@/components/engine-flight-hours/maintenance/data-preview";

export default async function Page() {
  const [records, aircraft] = await Promise.all([
    getMaintenanceRecords(),
    getAircraftProfiles(),
  ]);

  return <DataPreview records={records} aircraft={aircraft} />;
}
