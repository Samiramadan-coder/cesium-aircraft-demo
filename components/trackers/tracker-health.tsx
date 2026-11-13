"use client";

import { useFormatter, useTranslations } from "next-intl";
import { cn } from "cn";
import { getTrackerHealth } from "@/lib/actions/trackers";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConnectionEvent, HealthPoint } from "@/types/trackers";
import { ErrorNotice, Panel } from "./feedback";
import HealthChart, { type HealthChartPoint } from "./health-chart";
import { DATE_TIME_FORMAT, EMPTY, toDate } from "./shared";
import { useLoad } from "@/hooks/use-load";

// The battery line has no theme token; a blue that stays readable on the card.
const BATTERY_COLOR = "#5aa9e6";

/** One metric as chart points, skipping hours with no reading. */
function toSeries(
  points: HealthPoint[],
  key: "signalStrength" | "batteryPercent",
): HealthChartPoint[] {
  return points
    .filter((point) => point[key] != null)
    .map((point) => ({ hoursAgo: point.hoursAgo, value: point[key] as number }))
    .sort((a, b) => b.hoursAgo - a.hoursAgo);
}

/**
 * The "Health" tab: the 24h charts load when the tab opens; the connection
 * events come with the tracker's details.
 */
export default function TrackerHealthTab({
  trackerId,
  events,
}: {
  trackerId: string;
  events: ConnectionEvent[];
}) {
  const t = useTranslations("Trackers.details.health");
  const { state, retry } = useLoad(trackerId, getTrackerHealth);

  return (
    <div className="space-y-6">
      {state.status === "loading" && (
        <div className="space-y-6">
          <Skeleton className="h-28 bg-card-2" />
          <Skeleton className="h-28 bg-card-2" />
        </div>
      )}

      {state.status === "error" && (
        <ErrorNotice message={state.message} onRetry={retry} />
      )}

      {state.status === "ready" && (
        <>
          <ChartSection
            title={t("signalTitle")}
            label={t("signal")}
            color="var(--primary)"
            series={toSeries(state.data, "signalStrength")}
          />
          <ChartSection
            title={t("batteryTitle")}
            label={t("battery")}
            color={BATTERY_COLOR}
            series={toSeries(state.data, "batteryPercent")}
          />
        </>
      )}

      <ConnectionEvents events={events} />
    </div>
  );
}

function ChartSection({
  title,
  label,
  color,
  series,
}: {
  title: string;
  label: string;
  color: string;
  series: HealthChartPoint[];
}) {
  const t = useTranslations("Trackers.details.health");

  return (
    <section className="space-y-2">
      <h4 className="text-sm text-foreground-2">{title}</h4>
      {series.length < 2 ? (
        <Panel className="text-sm text-muted">{t("noData")}</Panel>
      ) : (
        <HealthChart data={series} label={label} color={color} />
      )}
    </section>
  );
}

function ConnectionEvents({ events }: { events: ConnectionEvent[] }) {
  const t = useTranslations("Trackers.details.health");
  const format = useFormatter();

  const rows = events
    .map((event) => ({ ...event, date: toDate(event.time) }))
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

  return (
    <section className="space-y-2">
      <h4 className="text-sm text-foreground-2">{t("eventsTitle")}</h4>
      {rows.length === 0 ? (
        <Panel className="text-sm text-muted">{t("noEvents")}</Panel>
      ) : (
        <ul className="space-y-2">
          {rows.map((event, index) => (
            <li key={`${event.type}-${String(event.time)}-${index}`}>
              <Panel className="flex items-center justify-between gap-4 text-sm">
                <span
                  className={cn(
                    event.type === "connected" ? "text-success" : "text-danger",
                  )}
                >
                  {t.has(`events.${event.type}`)
                    ? t(`events.${event.type}`)
                    : event.type}
                </span>
                <span className="text-foreground-2 tabular-nums">
                  {event.date
                    ? format.dateTime(event.date, DATE_TIME_FORMAT)
                    : EMPTY}
                </span>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
