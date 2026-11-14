import { getAlertKpis } from "@/lib/data/alerts";
import Kpis from "@/components/alerts/kpis";
import PageSwitcher from "@/components/alerts/page-switcher";

/** KPIs and tabs, shared by the alert feed and the alert rules. */
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const kpis = await getAlertKpis();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Kpis kpis={kpis} />

      <PageSwitcher />

      {children}
    </div>
  );
}
