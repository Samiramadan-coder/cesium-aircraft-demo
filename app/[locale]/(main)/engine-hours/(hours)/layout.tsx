import { navPageMetadata } from "@/lib/page-metadata";
import {
  getFleet,
  getFleetHours,
  toMaintenanceAircraft,
} from "@/lib/data/engine-hours";
import Header from "@/components/engine-flight-hours/header";
import PageSwitcher from "@/components/engine-flight-hours/page-switcher";

export const generateMetadata = navPageMetadata("engineHours");

/**
 * KPIs and the tab switcher, shared by every tab. Lives in a route group so
 * `engine-hours/loading.tsx` and `error.tsx` wrap it (a segment's own
 * boundaries only wrap its children, not its layout).
 */
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ kpis }, fleet] = await Promise.all([getFleetHours(), getFleet()]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Header kpis={kpis} maintenanceAircraft={toMaintenanceAircraft(fleet)} />

      <PageSwitcher />

      {children}
    </div>
  );
}
