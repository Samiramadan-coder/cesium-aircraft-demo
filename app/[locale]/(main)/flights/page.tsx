import Charts from "@/components/flights/charts";
import DataPreview from "@/components/flights/data-preview";
import Header from "@/components/flights/header";
import { api } from "@/lib/api/client";
import { getAircraftProfiles, getPilots } from "@/lib/data/engine-hours";
import { navPageMetadata } from "@/lib/page-metadata";
import type { Flight, FlightsSummary, KPIS, Paginated } from "@/types/flights";

export const generateMetadata = navPageMetadata("flights");

export default async function Page() {
  const [kpis, flights, aircraft, pilots, charts] = await Promise.all([
    api.get<KPIS>("/v1/tracking/flights/kpis"),
    api.get<Paginated<Flight>>("/v1/tracking/flights"),
    getAircraftProfiles(),
    getPilots(),
    api.get<FlightsSummary>("/v1/tracking/flights/summary"),
  ]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Header kpis={kpis} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="min-w-0 md:col-span-3">
          <DataPreview
            flights={flights.data}
            aircraft={aircraft}
            pilots={pilots}
          />
        </div>

        <div>
          <Charts summary={charts} aircraft={aircraft} pilots={pilots} />
        </div>
      </div>
    </div>
  );
}
