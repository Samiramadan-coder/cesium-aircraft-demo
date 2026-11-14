import type { SearchParams } from "nuqs/server";
import {
  getAircraftProfiles,
  getFleetHours,
  getMaintenanceRecords,
} from "@/lib/data/engine-hours";
import {
  loadMaintenanceParams,
  toPeriodArgs,
} from "@/lib/search-params/engine-hours";
import Kpis from "@/components/engine-flight-hours/kpis";
import DataPreview from "@/components/engine-flight-hours/maintenance/data-preview";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await loadMaintenanceParams(searchParams);
  const [{ kpis }, records, aircraft] = await Promise.all([
    getFleetHours(...toPeriodArgs(params)),
    getMaintenanceRecords({ aircraftId: params.aircraftId, type: params.type }),
    getAircraftProfiles(),
  ]);

  return (
    <>
      <Kpis kpis={kpis} />

      <DataPreview records={records} aircraft={aircraft} />
    </>
  );
}
