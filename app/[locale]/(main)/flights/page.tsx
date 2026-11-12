import { navPageMetadata } from "@/lib/page-metadata";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const generateMetadata = navPageMetadata("flights");

export default async function Page() {
  return <PagePlaceholder page="flights" />;
}
