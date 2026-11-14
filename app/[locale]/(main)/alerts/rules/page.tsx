import RulesTable from "@/components/alerts/rules-table";
import { getAlertRules } from "@/lib/data/alerts";
import { navPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = navPageMetadata("alerts");

export default async function Page() {
  const rules = await getAlertRules();

  return <RulesTable rules={rules} />;
}
