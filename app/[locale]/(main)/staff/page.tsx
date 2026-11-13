import DataPreview from "@/components/staff/data-preview";
import Header from "@/components/staff/header";
import { api } from "@/lib/api/client";
import { navPageMetadata } from "@/lib/page-metadata";
import type { StaffMember } from "@/types/user";

export const generateMetadata = navPageMetadata("staff");

export default async function Page() {
  const staff = await api.get<StaffMember[]>("/v1/users?role=engineer");

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Header />

      <DataPreview staff={staff} />
    </div>
  );
}
