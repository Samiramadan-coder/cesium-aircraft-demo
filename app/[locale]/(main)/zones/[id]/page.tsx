import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { api } from "@/lib/api/client";
import { toActiveFlightZones } from "@/lib/aircraft/live-tracking";
import { getZones } from "@/lib/data/flights";
import { ZoneHeader } from "@/components/zones/zone-details";
import ZoneWorkspace from "@/components/zones/zone-workspace";
import type { ZoneComputed, ZoneVersion } from "@/types/tracking";

type Props = { params: Promise<{ locale: string; id: string }> };

/** The zone with this id; there's no single-zone endpoint, so it's the list. */
async function getZone(id: string) {
  const zones = await getZones();
  return { zone: zones.find((item) => item.id === id), zones };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const [t, { zone }] = await Promise.all([
    getTranslations({ locale, namespace: "Zones.details" }),
    getZone(decodeURIComponent(id)),
  ]);
  const name = zone ? (locale === "ar" && zone.nameAr) || zone.name : id;
  return { title: t("title", { zone: name }) };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const zoneId = decodeURIComponent(id);
  const zonePath = `/v1/tracking/zones/${encodeURIComponent(zoneId)}`;
  const [{ zone, zones }, versions, computed] = await Promise.all([
    getZone(zoneId),
    api.get<ZoneVersion[]>(`${zonePath}/versions`),
    // Only extra measurements: if they fail, the page still shows the zone.
    api.get<ZoneComputed>(`${zonePath}/computed`).catch((error) => {
      unstable_rethrow(error);
      return null;
    }),
  ]);
  if (!zone) notFound();

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <ZoneHeader zone={zone} />

      <ZoneWorkspace
        zone={zone}
        versions={versions}
        computed={computed}
        otherZones={toActiveFlightZones(zones).filter(
          (item) => item.id !== zone.id,
        )}
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
      />
    </div>
  );
}
