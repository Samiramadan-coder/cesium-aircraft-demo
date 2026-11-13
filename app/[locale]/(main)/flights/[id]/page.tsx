import { api } from "@/lib/api/client";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const flightDetails = await api.get(`/v1/tracking/flights/${id}`);

  console.log(flightDetails);

  return <div className="p-4 sm:p-6">Page</div>;
}
