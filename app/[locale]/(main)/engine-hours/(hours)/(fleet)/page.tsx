import {
  getFleet,
  getPilots,
  toMaintenanceAircraft,
} from "@/lib/data/engine-hours";
import DataPreview from "@/components/engine-flight-hours/fleet/data-preview";

export default async function Page() {
  const [fleet, pilots] = await Promise.all([getFleet(), getPilots()]);

  return (
    <DataPreview
      aircraft={fleet}
      pilots={pilots}
      maintenanceAircraft={toMaintenanceAircraft(fleet)}
    />
  );
}
