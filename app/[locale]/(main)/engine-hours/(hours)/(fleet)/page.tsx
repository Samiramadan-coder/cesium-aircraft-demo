import type { SearchParams } from "nuqs/server";
import {
  getFleet,
  getFleetHours,
  getPilots,
  toMaintenanceAircraft,
} from "@/lib/data/engine-hours";
import {
  loadPeriodParams,
  toPeriodArgs,
} from "@/lib/search-params/engine-hours";
import Kpis from "@/components/engine-flight-hours/kpis";
import DataPreview from "@/components/engine-flight-hours/fleet/data-preview";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const period = toPeriodArgs(await loadPeriodParams(searchParams));
  const [{ kpis }, fleet, pilots] = await Promise.all([
    getFleetHours(...period),
    getFleet(...period),
    getPilots(),
  ]);

  return (
    <>
      <Kpis kpis={kpis} />

      <DataPreview
        aircraft={fleet}
        pilots={pilots}
        maintenanceAircraft={toMaintenanceAircraft(fleet)}
      />
    </>
  );
}
