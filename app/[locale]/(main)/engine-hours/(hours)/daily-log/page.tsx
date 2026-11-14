import type { SearchParams } from "nuqs/server";
import {
  getAircraftProfiles,
  getDailyLog,
  getFleetHours,
  getPilots,
} from "@/lib/data/engine-hours";
import {
  loadDailyLogParams,
  toPeriodArgs,
} from "@/lib/search-params/engine-hours";
import Kpis from "@/components/engine-flight-hours/kpis";
import DataPreview from "@/components/engine-flight-hours/daily-log/data-preview";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await loadDailyLogParams(searchParams);
  const period = toPeriodArgs(params);
  const [{ kpis }, logs, pilots, aircraft] = await Promise.all([
    getFleetHours(...period),
    getDailyLog({ search: params.search.trim() }, ...period),
    getPilots(),
    getAircraftProfiles(),
  ]);

  return (
    <>
      <Kpis kpis={kpis} />

      <DataPreview logs={logs} pilots={pilots} aircraft={aircraft} />
    </>
  );
}
