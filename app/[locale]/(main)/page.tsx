import { unstable_rethrow } from "next/navigation";
import { AircraftDemo } from "@/components/aircraft/aircraft-demo";
import { api } from "@/lib/api/client";
import {
  toAircraftEvents,
  toAircraftTrail,
  toAircraftUpdates,
  toAirfieldLayout,
  toFlightZones,
  toLiveAlerts,
} from "@/lib/aircraft/live-tracking";
import type { Tracker } from "@/types/trackers";
import type {
  LiveTrackingSnapshot,
  TimelineEvent,
  TrailPoint,
} from "@/types/tracking";

/** How far back each aircraft's route is drawn. */
const TRAIL_MINUTES = 60;

/** Extras the map works without: a failure gives the fallback. */
function optional<T>(request: Promise<T>, fallback: T): Promise<T> {
  return request.catch((error) => {
    unstable_rethrow(error);
    console.error("[live] Optional request failed", error);
    return fallback;
  });
}

export default async function AircraftDemoPage() {
  const [snapshot, trackers, timeline] = await Promise.all([
    api.get<LiveTrackingSnapshot>("/v1/tracking/live"),
    // For the tracker model in the info panel.
    optional(api.get<Tracker[]>("/v1/tracking/trackers"), []),
    // Takeoffs, landings, status changes… listed in the info panel.
    optional(api.get<TimelineEvent[]>("/v1/tracking/live/timeline"), []),
  ]);

  // The recent route of every aircraft on the map.
  const trails = Object.fromEntries(
    await Promise.all(
      snapshot.positions.map(async ({ aircraftId }) => {
        const points = await optional(
          api.get<TrailPoint[]>(
            `/v1/tracking/live/${encodeURIComponent(aircraftId)}/trail`,
            { query: { minutes: TRAIL_MINUTES } },
          ),
          [],
        );
        return [aircraftId, toAircraftTrail(points)] as const;
      }),
    ),
  );

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const hasMapKey =
    Boolean(googleMapsApiKey) ||
    Boolean(process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN);

  return (
    <AircraftDemo
      googleMapsApiKey={googleMapsApiKey}
      hasMapKey={hasMapKey}
      initialAircraft={toAircraftUpdates(snapshot, trackers)}
      trails={trails}
      events={toAircraftEvents(timeline)}
      zones={toFlightZones(snapshot)}
      kpis={snapshot.kpis}
      airfield={toAirfieldLayout(snapshot)}
      alerts={toLiveAlerts(snapshot)}
      signalLossTimeoutSec={snapshot.settings?.signalLossTimeoutSec}
      serverTime={snapshot.serverTime}
    />
  );
}
