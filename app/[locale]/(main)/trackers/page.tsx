import { api } from "@/lib/api/client";
import { navPageMetadata } from "@/lib/page-metadata";
import type { FirmwareVersion, KPIS, Tracker } from "@/types/trackers";
import type { TrackedAircraft } from "@/types/tracking";
import DataPreview from "@/components/trackers/data-preview";
import Header from "@/components/trackers/header";

export const generateMetadata = navPageMetadata("trackers");

export default async function Page() {
  const [trackers, aircraft, kpis, firmwareVersions] = await Promise.all([
    api.get<Tracker[]>("/v1/tracking/trackers"),
    api.get<TrackedAircraft[]>("/v1/aircraft"),
    api.get<KPIS>("/v1/tracking/trackers/kpis"),
    api.get<FirmwareVersion[]>("/v1/firmware-versions"),
  ]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Header kpis={kpis} firmwareVersions={firmwareVersions} />

      <DataPreview
        trackers={trackers}
        aircraft={aircraft}
        firmwareVersions={firmwareVersions}
      />
    </div>
  );
}
