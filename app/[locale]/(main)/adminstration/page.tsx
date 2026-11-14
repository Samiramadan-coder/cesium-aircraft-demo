import type { SearchParams } from "nuqs/server";
import { api } from "@/lib/api/client";
import type { StaffMember } from "@/types/user";
import { navPageMetadata } from "@/lib/page-metadata";
import { loadStaffSearchParams } from "@/lib/search-params/staff";
import Header from "@/components/adminstration/staff/header";
import DataPreview from "@/components/adminstration/staff/data-preview";

export const generateMetadata = navPageMetadata("adminstration");

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { role } = await loadStaffSearchParams(searchParams);
  const staff = await api.get<StaffMember[]>("/v1/users", {
    query: { role },
  });

  return (
    <>
      <Header />

      <DataPreview staff={staff} />
    </>
  );
}
