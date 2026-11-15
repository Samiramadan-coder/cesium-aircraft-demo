import { unstable_rethrow } from "next/navigation";
import { AircraftDemo } from "@/components/aircraft/aircraft-demo";
import { api } from "@/lib/api/client";
import {
  toAircraftUpdates,
  toAirfieldLayout,
  toFlightZones,
  toLiveAlerts,
} from "@/lib/aircraft/live-tracking";
import type { Tracker } from "@/types/trackers";
import type { LiveTrackingSnapshot } from "@/types/tracking";

export default async function AircraftDemoPage() {
  const [snapshot, trackers] = await Promise.all([
    api.get<LiveTrackingSnapshot>("/v1/tracking/live"),
    // Only for the tracker model in the info panel; the map works without it.
    api.get<Tracker[]>("/v1/tracking/trackers").catch((error) => {
      unstable_rethrow(error);
      return [];
    }),
  ]);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const hasMapKey =
    Boolean(googleMapsApiKey) ||
    Boolean(process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN);

  return (
    <AircraftDemo
      googleMapsApiKey={googleMapsApiKey}
      hasMapKey={hasMapKey}
      initialAircraft={toAircraftUpdates(snapshot, trackers)}
      zones={toFlightZones(snapshot)}
      kpis={snapshot.kpis}
      airfield={toAirfieldLayout(snapshot)}
      alerts={toLiveAlerts(snapshot)}
      signalLossTimeoutSec={snapshot.settings?.signalLossTimeoutSec}
    />
  );
}
