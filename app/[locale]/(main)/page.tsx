import { AircraftDemo } from "@/components/aircraft/aircraft-demo";
import { api } from "@/lib/api/client";

// Server Component: call the backend here with `api` from "@/lib/api/client"
// and pass the result down to <AircraftDemo /> as props, e.g.
//   const flights = await api.get<Flight[]>("flights");
export default async function AircraftDemoPage() {
  const response = await api.get("/v1/tracking/live");

  console.log(response);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const hasMapKey =
    Boolean(googleMapsApiKey) ||
    Boolean(process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN);

  return (
    <AircraftDemo googleMapsApiKey={googleMapsApiKey} hasMapKey={hasMapKey} />
  );
}
