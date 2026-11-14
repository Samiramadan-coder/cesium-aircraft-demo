import type { SearchParams } from "nuqs/server";
import Charts from "@/components/flights/charts";
import DataPreview from "@/components/flights/data-preview";
import Filters from "@/components/flights/filters";
import Header from "@/components/flights/header";
import Pagination from "@/components/flights/pagination";
import { getAircraftProfiles, getPilots } from "@/lib/data/engine-hours";
import {
  getFlightKpis,
  getFlights,
  getFlightsSummary,
} from "@/lib/data/flights";
import { navPageMetadata } from "@/lib/page-metadata";
import {
  hasFlightFilters,
  loadFlightsSearchParams,
  toFlightsQuery,
} from "@/lib/search-params/flights";

export const generateMetadata = navPageMetadata("flights");

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = await loadFlightsSearchParams(searchParams);

  const [kpis, flights, summary, aircraft, pilots] = await Promise.all([
    getFlightKpis(),
    getFlights(toFlightsQuery(filters)),
    getFlightsSummary(),
    getAircraftProfiles(),
    getPilots(),
  ]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Header kpis={kpis} />

      <Filters aircraft={aircraft} pilots={pilots} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="min-w-0 space-y-4 md:col-span-3">
          <DataPreview
            flights={flights.data}
            aircraft={aircraft}
            pilots={pilots}
            filtered={hasFlightFilters(filters)}
          />

          <Pagination meta={flights.meta} />
        </div>

        <Charts summary={summary} aircraft={aircraft} pilots={pilots} />
      </div>
    </div>
  );
}
