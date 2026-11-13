"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "cn";
import { getTrackerHealth } from "@/lib/actions/trackers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { HealthPoint, TrackerHealth } from "@/types/trackers";
import HealthChart from "./health-chart";
import { toDate } from "./shared";

type HealthState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: TrackerHealth };

// The battery line has no theme token; a blue that stays readable on the card.
const BATTERY_COLOR = "#5aa9e6";

/** Drops points with an unparsable time and sorts oldest → newest. */
function toSeries(points: HealthPoint[]) {
  return points
    .map((point) => ({ time: toDate(point.time)?.getTime(), value: point.value }))
    .filter((point): point is { time: number; value: number } => point.time != null)
    .sort((a, b) => a.time - b.time);
}

/** The "Health" tab — loads when the tab is opened. */
export default function TrackerHealthTab({ trackerId }: { trackerId: string }) {
  const t = useTranslations("Trackers.details");
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  const load = useCallback(async (id: string) => {
    setHealth({ status: "loading" });
    const result = await getTrackerHealth(id);
    setHealth(
      result.ok
        ? { status: "ready", data: result.data }
        : { status: "error", message: result.message },
    );
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on open
    load(trackerId);
  }, [trackerId, load]);

  if (health.status === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 bg-card-2" />
        <Skeleton className="h-28 bg-card-2" />
        <Skeleton className="h-40 bg-card-2" />
      </div>
    );
  }

  if (health.status === "error") {
    return (
      <div className="space-y-3 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        <p>{health.message}</p>
        <Button
          size="sm"
          variant="outline"
          className="border-border bg-card text-foreground hover:bg-card-2"
          onClick={() => load(trackerId)}
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  return <Health data={health.data} />;
}

function Health({ data }: { data: TrackerHealth }) {
  const t = useTranslations("Trackers.details.health");

  return (
    <div className="space-y-6">
      <ChartSection
        title={t("signalTitle")}
        label={t("signal")}
        color="var(--primary)"
        points={data.signalHistory}
      />
      <ChartSection
        title={t("batteryTitle")}
        label={t("battery")}
        color={BATTERY_COLOR}
        points={data.batteryHistory}
      />
      <ConnectionEvents events={data.connectionEvents} />
    </div>
  );
}

function ChartSection({
  title,
  label,
  color,
  points,
}: {
  title: string;
  label: string;
  color: string;
  points: HealthPoint[];
}) {
  const t = useTranslations("Trackers.details.health");
  const series = toSeries(points ?? []);

  return (
    <section className="space-y-2">
      <h4 className="text-sm text-foreground-2">{title}</h4>
      {series.length < 2 ? (
        <p className="rounded-lg border border-border bg-card-2/40 p-3 text-sm text-muted">
          {t("noData")}
        </p>
      ) : (
        <HealthChart data={series} label={label} color={color} />
      )}
    </section>
  );
}

function ConnectionEvents({
  events,
}: {
  events: TrackerHealth["connectionEvents"];
}) {
  const t = useTranslations("Trackers.details.health");
  const format = useFormatter();

  const rows = (events ?? [])
    .map((event) => ({ ...event, date: toDate(event.time) }))
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

  return (
    <section className="space-y-2">
      <h4 className="text-sm text-foreground-2">{t("eventsTitle")}</h4>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-card-2/40 p-3 text-sm text-muted">
          {t("noEvents")}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((event, index) => (
            <li
              key={`${event.type}-${String(event.time)}-${index}`}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card-2/40 p-3 text-sm"
            >
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
                  ? format.dateTime(event.date, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
