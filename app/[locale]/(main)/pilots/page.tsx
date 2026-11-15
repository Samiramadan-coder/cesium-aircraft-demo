import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { api } from "@/lib/api/client";
import { navPageMetadata } from "@/lib/page-metadata";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";
import DataPreview from "@/components/pilots/data-preview";
import PilotForm from "@/components/pilots/pilot-form";
import { Button } from "@/components/ui/button";

export const generateMetadata = navPageMetadata("pilots");

export default async function Page() {
  const [pilots, aircraft, t] = await Promise.all([
    api.get<TrackedPilot[]>("/v1/pilots"),
    api.get<TrackedAircraft[]>("/v1/aircraft"),
    getTranslations("Pilots"),
  ]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex justify-end">
        <PilotForm
          trigger={
            <Button type="button" size="lg">
              <Plus />
              {t("addPilot")}
            </Button>
          }
        />
      </div>

      <DataPreview pilots={pilots} aircraft={aircraft} />
    </div>
  );
}
