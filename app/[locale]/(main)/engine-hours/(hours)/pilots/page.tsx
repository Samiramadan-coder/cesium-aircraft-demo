import type { SearchParams } from "nuqs/server";
import {
  getAircraftProfiles,
  getFleetHours,
  getPilotHours,
  getPilots,
} from "@/lib/data/engine-hours";
import {
  loadPeriodParams,
  toPeriodArgs,
} from "@/lib/search-params/engine-hours";
import Kpis from "@/components/engine-flight-hours/kpis";
import DataPreview from "@/components/engine-flight-hours/pilots/data-preview";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const period = toPeriodArgs(await loadPeriodParams(searchParams));
  const [{ kpis }, hours, pilots, aircraft] = await Promise.all([
    getFleetHours(...period),
    getPilotHours(...period),
    getPilots(),
    getAircraftProfiles(),
  ]);

  return (
    <>
      <Kpis kpis={kpis} />

      <DataPreview hours={hours} pilots={pilots} aircraft={aircraft} />
    </>
  );
}
