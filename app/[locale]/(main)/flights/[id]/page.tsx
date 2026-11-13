import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import DetailsHeader from "@/components/flights/details/details-header";
import DetailsSidebar from "@/components/flights/details/details-sidebar";
import ReplayPlayer from "@/components/flights/details/replay-player";
import { routing } from "@/i18n/routing";
import { toActiveFlightZones } from "@/lib/aircraft/live-tracking";
import { getAircraftProfiles, getPilots } from "@/lib/data/engine-hours";
import {
  getFlightEvents,
  getFlightReplay,
  getZones,
  highestCeilingFt,
} from "@/lib/data/flights";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Flights.details" });
  return { title: t("title", { id: id.toUpperCase() }) };
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  const [{ flight, points }, events, zones, aircraft, pilots] =
    await Promise.all([
      getFlightReplay(id),
      getFlightEvents(id),
      getZones(),
      getAircraftProfiles(),
      getPilots(),
    ]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DetailsHeader flight={flight} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ReplayPlayer
          points={points}
          zones={toActiveFlightZones(zones)}
          alerts={events.alerts}
          takeoffTime={flight.takeoffTime}
          landingTime={flight.landingTime}
          ceilingFt={highestCeilingFt(zones)}
          googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
        />

        <DetailsSidebar
          flight={flight}
          aircraft={aircraft.find((item) => item.id === flight.aircraftId)}
          pilot={pilots.find((item) => item.id === flight.pilotId)}
          alerts={events.alerts}
        />
      </div>
    </div>
  );
}
