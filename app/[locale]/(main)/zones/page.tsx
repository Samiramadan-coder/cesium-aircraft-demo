import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { api } from "@/lib/api/client";
import { navPageMetadata } from "@/lib/page-metadata";
import type { TrackedZone } from "@/types/tracking";
import { Button } from "@/components/ui/button";
import DataPreview from "@/components/zones/data-preview";
import ZoneForm from "@/components/zones/zone-form";

export const generateMetadata = navPageMetadata("zones");

export default async function Page() {
  const [zones, t] = await Promise.all([
    api.get<TrackedZone[]>("/v1/tracking/zones"),
    getTranslations("Zones"),
  ]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ZoneForm
          trigger={
            <Button type="button" size="lg">
              <Plus />
              {t("addZone")}
            </Button>
          }
        />
      </div>

      <DataPreview zones={zones} />
    </div>
  );
}
