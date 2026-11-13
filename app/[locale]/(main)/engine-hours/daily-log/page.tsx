import { api } from "@/lib/api/client";
import type { DailyLogEntry } from "@/types/engine-flight-hours";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";
import DataPreview from "@/components/engine-flight-hours/daily-log/data-preview";

export default async function Page() {
  const [logs, pilots, aircraft] = await Promise.all([
    api.get<DailyLogEntry[]>("/v1/tracking/hours/daily-log"),
    api.get<TrackedPilot[]>("/v1/pilots"),
    api.get<TrackedAircraft[]>("/v1/aircraft"),
  ]);

  return <DataPreview logs={logs} pilots={pilots} aircraft={aircraft} />;
}
