import { navPageMetadata } from "@/lib/page-metadata";
import { getFleet, toMaintenanceAircraft } from "@/lib/data/engine-hours";
import { DEFAULT_PERIOD } from "@/lib/search-params/engine-hours";
import Header from "@/components/engine-flight-hours/header";
import PageSwitcher from "@/components/engine-flight-hours/page-switcher";

export const generateMetadata = navPageMetadata("engineHours");

/**
 * Title, tabs and filters, shared by every tab. The KPIs live in each page,
 * since a layout can't read `searchParams` and they follow `?period=`.
 * Lives in a route group so `engine-hours/loading.tsx` and `error.tsx` wrap
 * it (a segment's own boundaries only wrap its children, not its layout).
 */
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Lifetime hours only, so any period will do; the default one is shared
  // with the fleet tab's own request.
  const maintenanceAircraft = toMaintenanceAircraft(
    await getFleet(DEFAULT_PERIOD),
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Header maintenanceAircraft={maintenanceAircraft} />

      <PageSwitcher maintenanceAircraft={maintenanceAircraft} />

      {children}
    </div>
  );
}
