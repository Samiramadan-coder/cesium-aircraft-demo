import { ArrowUpRight } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useAlertType, SeverityBadge } from "@/components/alerts/shared";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { LiveAlert } from "@/lib/aircraft/live-tracking";

/** Alerts shown before the list says "and N more". */
const MAX_ALERTS = 4;

type AircraftAlertsProps = {
  alerts: LiveAlert[];
  /** Clicking an alert selects its aircraft. */
  onSelectAircraft: (id: string) => void;
};

// Active alerts under the info panel. Hidden on phones, where the KPI card
// links to the alerts page instead; nothing is shown while there are none.
export function AircraftAlerts({
  alerts,
  onSelectAircraft,
}: AircraftAlertsProps) {
  const t = useTranslations("AircraftAlerts");
  const format = useFormatter();
  const alertType = useAlertType();
  const now = useNow({ updateInterval: 30_000 });
  if (alerts.length === 0) return null;

  const shown = alerts.slice(0, MAX_ALERTS);
  const more = alerts.length - shown.length;

  return (
    <Card
      size="sm"
      className="gap-2 bg-card/80 px-3 py-2.5 shadow-xl backdrop-blur-md supports-backdrop-filter:bg-card/70 max-sm:hidden"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase rtl:tracking-normal">
          {t("title")}
        </h2>
        <Link
          href="/alerts"
          className="inline-flex items-center gap-0.5 text-xs text-sky-400 hover:underline"
        >
          {t("viewAll")}
          <ArrowUpRight className="size-3 rtl:-scale-x-100" />
        </Link>
      </div>
      <ul className="flex flex-col gap-1">
        {shown.map((alert) => (
          <li key={alert.id}>
            <button
              type="button"
              className="flex w-full flex-col gap-1 rounded-md px-2 py-1.5 text-start hover:bg-muted/60"
              onClick={() => onSelectAircraft(alert.aircraftId)}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs">
                  {alert.aircraftLabel}
                </span>
                <SeverityBadge severity={alert.severity} />
              </span>
              <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">{alertType(alert)}</span>
                <span className="shrink-0 tabular-nums">
                  {format.relativeTime(alert.triggeredAt, now)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <p className="px-2 text-xs text-muted-foreground">
          {t("more", { count: more })}
        </p>
      )}
    </Card>
  );
}
