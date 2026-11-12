import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { navPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = navPageMetadata("trackers");

export default function Page() {
  return <PagePlaceholder page="trackers" />;
}
