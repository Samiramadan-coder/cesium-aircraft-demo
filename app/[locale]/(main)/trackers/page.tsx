import type { SearchParams } from "nuqs/server";
import { api } from "@/lib/api/client";
import { navPageMetadata } from "@/lib/page-metadata";
import { loadTrackersSearchParams } from "@/lib/search-params/trackers";
import type { FirmwareVersion, KPIS, Tracker } from "@/types/trackers";
import type { TrackedAircraft } from "@/types/tracking";
import DataPreview from "@/components/trackers/data-preview";
import Filters from "@/components/trackers/filters";
import Header from "@/components/trackers/header";

export const generateMetadata = navPageMetadata("trackers");

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { search, ...filters } = await loadTrackersSearchParams(searchParams);
  const query = { ...filters, search: search || undefined };
  const filtered = Object.values(query).some((value) => value != null);

  const [trackers, allTrackers, aircraft, kpis, firmwareVersions] =
    await Promise.all([
      api.get<Tracker[]>("/v1/tracking/trackers", { query }),
      // The unfiltered list, to tell which aircraft are free to link.
      filtered ? api.get<Tracker[]>("/v1/tracking/trackers") : null,
      api.get<TrackedAircraft[]>("/v1/aircraft"),
      api.get<KPIS>("/v1/tracking/trackers/kpis"),
      api.get<FirmwareVersion[]>("/v1/firmware-versions"),
    ]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Header kpis={kpis} firmwareVersions={firmwareVersions} />

      <Filters
        models={firmwareVersions.map((item) => item.model)}
        aircraft={aircraft}
      />

      <DataPreview
        trackers={trackers}
        allTrackers={allTrackers ?? trackers}
        filtered={filtered}
        aircraft={aircraft}
        firmwareVersions={firmwareVersions}
      />
    </div>
  );
}
