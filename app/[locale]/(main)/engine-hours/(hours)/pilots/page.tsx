import {
  getAircraftProfiles,
  getPilotHours,
  getPilots,
} from "@/lib/data/engine-hours";
import DataPreview from "@/components/engine-flight-hours/pilots/data-preview";

export default async function Page() {
  const [hours, pilots, aircraft] = await Promise.all([
    getPilotHours(),
    getPilots(),
    getAircraftProfiles(),
  ]);

  return <DataPreview hours={hours} pilots={pilots} aircraft={aircraft} />;
}
