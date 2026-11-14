import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { SearchParams } from "nuqs/server";
import { api } from "@/lib/api/client";
import { navPageMetadata } from "@/lib/page-metadata";
import { loadZonesSearchParams } from "@/lib/search-params/zones";
import type {
  Aerodrome,
  TrackedZone,
  TrackingSettings as Settings,
} from "@/types/tracking";
import { Button } from "@/components/ui/button";
import AerodromeCard from "@/components/zones/aerodrome-card";
import DataPreview from "@/components/zones/data-preview";
import Filters from "@/components/zones/filters";
import TrackingSettings from "@/components/zones/tracking-settings";
import ZoneForm from "@/components/zones/zone-form";

export const generateMetadata = navPageMetadata("zones");

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { search, active } = await loadZonesSearchParams(searchParams);
  const query = { search: search || undefined, active };
  const filtered = Object.values(query).some((value) => value != null);

  const [zones, settings, aerodrome, t] = await Promise.all([
    api.get<TrackedZone[]>("/v1/tracking/zones", { query }),
    api.get<Settings>("/v1/tracking/settings"),
    api.get<Aerodrome>("/v1/aerodrome"),
    getTranslations("Zones"),
  ]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Filters />

        <ZoneForm
          trigger={
            <Button type="button" size="lg">
              <Plus />
              {t("addZone")}
            </Button>
          }
        />
      </div>

      <DataPreview zones={zones} filtered={filtered} />

      <TrackingSettings settings={settings} />

      <AerodromeCard aerodrome={aerodrome} />
    </div>
  );
}
