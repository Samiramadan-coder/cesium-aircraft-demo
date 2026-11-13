import Header from "@/components/flights/header";
import { api } from "@/lib/api/client";
import { navPageMetadata } from "@/lib/page-metadata";
import { KPIS } from "@/types/flights";

export const generateMetadata = navPageMetadata("flights");

export default async function Page() {
  const [kpis] = await Promise.all([
    api.get<KPIS>("/v1/tracking/flights/kpis"),
  ]);

  return (
    <div className="p-4 sm:p-6">
      <Header kpis={kpis} />
    </div>
  );
}
