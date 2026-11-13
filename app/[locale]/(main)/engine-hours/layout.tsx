import { api } from "@/lib/api/client";
import { Aircraft } from "@/types/aircraft";
import { KPIS } from "@/types/engine-flight-hours";
import Header from "@/components/engine-flight-hours/header";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const aircrafts = await api.get<{ aircraft: Aircraft[]; kpis: KPIS }>(
    "/v1/tracking/hours/fleet",
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Header kpis={aircrafts.kpis} />
      {children}
    </div>
  );
}
