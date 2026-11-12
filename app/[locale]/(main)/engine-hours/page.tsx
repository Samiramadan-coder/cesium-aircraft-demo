import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { navPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = navPageMetadata("engineHours");

export default function Page() {
  return <PagePlaceholder page="engineHours" />;
}
