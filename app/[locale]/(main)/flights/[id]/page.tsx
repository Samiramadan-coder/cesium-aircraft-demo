import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { hasLocale } from "next-intl";
import { getFormatter, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import DetailsActions from "@/components/flights/details/details-actions";
import DetailsSidebar from "@/components/flights/details/details-sidebar";
import ReplayPlayer from "@/components/flights/details/replay-player";
import { ComplianceBadge } from "@/components/engine-flight-hours/shared";
import { Link } from "@/i18n/navigation";
import { toActiveFlightZones } from "@/lib/aircraft/live-tracking";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { getAircraftProfiles, getPilots } from "@/lib/data/engine-hours";
import type { FlightEvents, FlightReplay } from "@/types/flights";
import type { TrackedZone } from "@/types/tracking";

type Props = { params: Promise<{ locale: string; id: string }> };

const displayId = (id: string) => id.toUpperCase();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Flights.details" });
  return { title: t("title", { id: displayId(id) }) };
}

async function getReplay(id: string) {
  try {
    return await api.get<FlightReplay>(
      `/v1/tracking/flights/${encodeURIComponent(id)}/replay`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  const [replay, events, zones, aircraft, pilots] = await Promise.all([
    getReplay(id),
    api.get<FlightEvents>(`/v1/tracking/flights/${encodeURIComponent(id)}/events`),
    api.get<TrackedZone[]>("/v1/tracking/zones"),
    getAircraftProfiles(),
    getPilots(),
  ]);

  const { flight, points } = replay;
  const t = await getTranslations("Flights");
  const format = await getFormatter();
  const flightZones = toActiveFlightZones(zones);

  // The altitude chart's dashed line: the highest ceiling the flight was
  // allowed to climb to.
  const ceilings = zones.filter((zone) => zone.active).map((zone) => zone.ceilingFt);
  const ceilingFt = ceilings.length > 0 ? Math.max(...ceilings) : undefined;

  const tTypes = await getTranslations("EngineHours.details.flightTypes");
  const typeKey = flight.flightType as "training";
  const flightType = tTypes.has(typeKey) ? tTypes(typeKey) : flight.flightType;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Link
            href="/flights"
            className="inline-flex items-center gap-1.5 text-sm text-foreground-2 hover:text-foreground print:hidden"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {t("details.back")}
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold text-foreground">
              {t("details.title", { id: displayId(flight.id) })}
            </h1>
            <ComplianceBadge compliance={flight.compliance} />
          </div>
          <p className="text-sm text-foreground-2">
            {format.dateTime(flight.engineStartTime, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            {" · "}
            {flightType}
          </p>
        </div>

        <DetailsActions flightId={flight.id} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ReplayPlayer
          points={points}
          zones={flightZones}
          alerts={events.alerts}
          takeoffTime={flight.takeoffTime}
          landingTime={flight.landingTime}
          ceilingFt={ceilingFt}
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
