import {
  getAircraftProfiles,
  getDailyLog,
  getPilots,
} from "@/lib/data/engine-hours";
import DataPreview from "@/components/engine-flight-hours/daily-log/data-preview";

export default async function Page() {
  const [logs, pilots, aircraft] = await Promise.all([
    getDailyLog(),
    getPilots(),
    getAircraftProfiles(),
  ]);

  return <DataPreview logs={logs} pilots={pilots} aircraft={aircraft} />;
}
