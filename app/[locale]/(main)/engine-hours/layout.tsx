import { api } from "@/lib/api/client";
import type { AirCraft, KPIS } from "@/types/engine-flight-hours";
import type { TrackedAircraft } from "@/types/tracking";
import { toMaintenanceAircraft } from "@/components/engine-flight-hours/maintainance/options";
import Header from "@/components/engine-flight-hours/header";
import PageSwitcher from "@/components/engine-flight-hours/page-switcher";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [fleet, profiles] = await Promise.all([
    api.get<{ kpis: KPIS; aircraft: AirCraft[] }>("/v1/tracking/hours/fleet"),
    api.get<TrackedAircraft[]>("/v1/aircraft"),
  ]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Header
        kpis={fleet.kpis}
        maintenanceAircraft={toMaintenanceAircraft(fleet.aircraft, profiles)}
      />

      <PageSwitcher />

      {children}
    </div>
  );
}
