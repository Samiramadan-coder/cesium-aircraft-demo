import { unstable_rethrow } from "next/navigation";
import type { SearchParams } from "nuqs/server";
import DataPreview from "@/components/alerts/data-preview";
import Filters from "@/components/alerts/filters";
import Pagination from "@/components/flights/pagination";
import { api } from "@/lib/api/client";
import { getAlerts } from "@/lib/data/alerts";
import { getAircraftProfiles, getPilots } from "@/lib/data/engine-hours";
import { getZones } from "@/lib/data/flights";
import { navPageMetadata } from "@/lib/page-metadata";
import {
  hasAlertFilters,
  loadAlertsSearchParams,
  toAlertsQuery,
} from "@/lib/search-params/alerts";
import type { StaffMember } from "@/types/user";

export const generateMetadata = navPageMetadata("alerts");

/**
 * Staff offered by "Assign". A failure (e.g. a role that can't list users)
 * leaves the list empty instead of breaking the page.
 */
async function getStaff(): Promise<StaffMember[]> {
  try {
    return await api.get<StaffMember[]>("/v1/users");
  } catch (error) {
    unstable_rethrow(error);
    console.error("[alerts] Couldn't load staff", error);
    return [];
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = await loadAlertsSearchParams(searchParams);

  const [alerts, aircraft, pilots, zones, staff] = await Promise.all([
    getAlerts(toAlertsQuery(filters)),
    getAircraftProfiles(),
    getPilots(),
    getZones(),
    getStaff(),
  ]);

  return (
    <div className="space-y-4">
      <Filters aircraft={aircraft} />

      <DataPreview
        alerts={alerts.data}
        aircraft={aircraft}
        pilots={pilots}
        zones={zones}
        staff={staff}
        filtered={hasAlertFilters(filters)}
      />

      <Pagination meta={alerts.meta} />
    </div>
  );
}
