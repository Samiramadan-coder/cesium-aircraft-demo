import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { api } from "@/lib/api/client";
import { navPageMetadata } from "@/lib/page-metadata";
import type { Tracker } from "@/types/trackers";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";
import AircraftForm from "@/components/aircrafts/aircraft-form";
import DataPreview from "@/components/aircrafts/data-preview";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/permissions-provider";

export const generateMetadata = navPageMetadata("aircrafts");

export default async function Page() {
  const [aircraft, pilots, trackers, t] = await Promise.all([
    api.get<TrackedAircraft[]>("/v1/aircraft"),
    api.get<TrackedPilot[]>("/v1/pilots"),
    api.get<Tracker[]>("/v1/tracking/trackers"),
    getTranslations("Aircrafts"),
  ]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Can permission="manageFleet">
        <div className="flex justify-end">
          <AircraftForm
            pilots={pilots}
            trigger={
              <Button type="button" size="lg">
                <Plus />
                {t("addAircraft")}
              </Button>
            }
          />
        </div>
      </Can>

      <DataPreview aircraft={aircraft} pilots={pilots} trackers={trackers} />
    </div>
  );
}
