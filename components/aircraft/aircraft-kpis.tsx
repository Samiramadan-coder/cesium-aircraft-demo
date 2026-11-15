import { Plane, TriangleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { LiveTrackingKpis } from "@/types/tracking";
import { cn } from "@/lib/utils";

const cardClass =
  "flex-row items-center gap-2.5 bg-card/80 px-3 py-2 shadow-xl backdrop-blur-md supports-backdrop-filter:bg-card/70";

// Fleet counters shown above the info panel; the alerts one opens the alerts page.
export function AircraftKpis({ kpis }: { kpis: LiveTrackingKpis }) {
  const t = useTranslations("AircraftKpis");
  const format = useFormatter();
  const alerting = kpis.activeAlerts > 0;

  return (
    <div className="grid grid-cols-2 gap-2">
      <Card size="sm" className={cardClass}>
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sky-400/10 text-sky-400">
          <Plane className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-base leading-none font-semibold tabular-nums">
            {format.number(kpis.aircraftAirborne)}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {t("aircraftAirborne")}
          </span>
        </div>
      </Card>
      <Link
        href="/alerts"
        className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card size="sm" className={cn(cardClass, "h-full hover:bg-card/90")}>
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-md",
              alerting
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground",
            )}
          >
            <TriangleAlert className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-base leading-none font-semibold tabular-nums">
              {format.number(kpis.activeAlerts)}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {t("activeAlerts")}
            </span>
          </div>
        </Card>
      </Link>
    </div>
  );
}
