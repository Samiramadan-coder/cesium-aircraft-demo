import Charts from "@/components/flights/charts";
import DataPreview from "@/components/flights/data-preview";
import Header from "@/components/flights/header";
import { getAircraftProfiles, getPilots } from "@/lib/data/engine-hours";
import {
  getFlightKpis,
  getFlights,
  getFlightsSummary,
} from "@/lib/data/flights";
import { navPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = navPageMetadata("flights");

export default async function Page() {
  const [kpis, flights, summary, aircraft, pilots] = await Promise.all([
    getFlightKpis(),
    getFlights(),
    getFlightsSummary(),
    getAircraftProfiles(),
    getPilots(),
  ]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Header kpis={kpis} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="min-w-0 md:col-span-3">
          <DataPreview
            flights={flights.data}
            aircraft={aircraft}
            pilots={pilots}
          />
        </div>

        <Charts summary={summary} aircraft={aircraft} pilots={pilots} />
      </div>
    </div>
  );
}
