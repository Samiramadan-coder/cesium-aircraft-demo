import { AircraftDemo } from "@/components/aircraft/aircraft-demo";
import { api } from "@/lib/api/client";
import { toAircraftUpdates, toFlightZones } from "@/lib/aircraft/live-tracking";
import type { LiveTrackingSnapshot } from "@/types/tracking";

export default async function AircraftDemoPage() {
  const snapshot = await api.get<LiveTrackingSnapshot>("/v1/tracking/live");

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const hasMapKey =
    Boolean(googleMapsApiKey) ||
    Boolean(process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN);

  return (
    <AircraftDemo
      googleMapsApiKey={googleMapsApiKey}
      hasMapKey={hasMapKey}
      initialAircraft={toAircraftUpdates(snapshot)}
      zones={toFlightZones(snapshot)}
    />
  );
}
