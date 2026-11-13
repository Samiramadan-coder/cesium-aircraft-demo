import DataPreview from "@/components/adminstration/alert-recepient/data-preview";
import Header from "@/components/adminstration/alert-recepient/header";
import { api } from "@/lib/api/client";
import { navPageMetadata } from "@/lib/page-metadata";
import type { NotificationRecipient } from "@/types/notification-recipients";

export const generateMetadata = navPageMetadata("adminstration");

export default async function Page() {
  const recipients = await api.get<NotificationRecipient[]>(
    "/v1/notification-recipients",
  );

  return (
    <>
      <Header />

      <DataPreview recipients={recipients} />
    </>
  );
}
