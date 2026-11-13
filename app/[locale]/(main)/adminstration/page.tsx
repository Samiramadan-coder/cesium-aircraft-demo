import DataPreview from "@/components/adminstration/staff/data-preview";
import Header from "@/components/adminstration/staff/header";
import { api } from "@/lib/api/client";
import { navPageMetadata } from "@/lib/page-metadata";
import type { StaffMember } from "@/types/user";

export const generateMetadata = navPageMetadata("adminstration");

export default async function Page() {
  const staff = await api.get<StaffMember[]>("/v1/users?role=engineer");

  return (
    <>
      <Header />

      <DataPreview staff={staff} />
    </>
  );
}
