import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { MaintenanceAircraftOption } from "@/types/engine-flight-hours";
import LogMaintenance from "./maintenance/log-maintenance";

export default function Header({
  maintenanceAircraft,
}: {
  maintenanceAircraft: MaintenanceAircraftOption[];
}) {
  const t = useTranslations("EngineHours");

  return (
    <section className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-foreground-2">{t("subtitle")}</p>
      </div>

      <LogMaintenance
        aircraft={maintenanceAircraft}
        trigger={
          <Button type="button" size="lg">
            <Plus />
            {t("logMaintenance")}
          </Button>
        }
      />
    </section>
  );
}
