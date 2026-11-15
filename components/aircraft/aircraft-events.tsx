import { useCallback } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { eventColor } from "@/lib/aircraft/events";
import type { AircraftEvent } from "@/types/aircraft";
import { cn } from "@/lib/utils";

/** Translated text of an event: "Takeoff", "Status: Normal → Near ceiling". */
export function useEventLabel() {
  const t = useTranslations("AircraftEvents");
  const tStatus = useTranslations("AircraftInfoPanel.trackingStatus");
  // Stable, so effects that use it don't re-run on every render.
  return useCallback(
    (event: AircraftEvent) => {
      const status = (value: string | undefined) =>
        value === undefined
          ? "?"
          : tStatus.has(value as "normal")
            ? tStatus(value as "normal")
            : value;
      if (event.type === "statusChanged") {
        return t("statusChanged", {
          from: status(event.from),
          to: status(event.to),
        });
      }
      const key = `types.${event.type}` as "types.takeoff";
      return t.has(key) ? t(key) : event.type;
    },
    [t, tStatus],
  );
}

type AircraftEventListProps = {
  /** Events of one aircraft, oldest first. */
  events: AircraftEvent[];
  /** Ids of the events with a known position, which can be flown to. */
  locatable: Set<string>;
  onSelectEvent: (event: AircraftEvent) => void;
};

// Recent events of the selected aircraft, newest first.
export function AircraftEventList({
  events,
  locatable,
  onSelectEvent,
}: AircraftEventListProps) {
  const t = useTranslations("AircraftEvents");
  const format = useFormatter();
  const label = useEventLabel();

  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("none")}</p>;
  }

  // A vertical timeline: one dot per event on a line, newest on top.
  return (
    <ol className="flex flex-col">
      {[...events].reverse().map((event, index, list) => {
        const canLocate = locatable.has(event.id);
        const color = eventColor(event);
        return (
          <li key={event.id} className="relative flex gap-2.5">
            {index < list.length - 1 && (
              <span
                aria-hidden
                className="absolute start-[4.5px] top-3.5 -bottom-1 w-px bg-border"
              />
            )}
            <span
              aria-hidden
              className="relative mt-[7px] size-2.5 shrink-0 rounded-full ring-[3px] ring-card"
              style={{ backgroundColor: color }}
            />
            <button
              type="button"
              disabled={!canLocate}
              title={canLocate ? t("showOnMap") : undefined}
              className={cn(
                "mb-1 flex min-w-0 flex-1 items-baseline justify-between gap-2 rounded-md px-2 py-1 text-start",
                canLocate
                  ? "transition-colors hover:bg-muted/60"
                  : "cursor-default",
              )}
              onClick={() => onSelectEvent(event)}
            >
              <span className="min-w-0 truncate text-xs font-medium">
                {label(event)}
              </span>
              <time
                dateTime={new Date(event.timestamp).toISOString()}
                className="shrink-0 text-[0.65rem] text-muted-foreground tabular-nums"
              >
                {format.dateTime(event.timestamp, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hourCycle: "h23",
                  timeZone: "UTC",
                })}
              </time>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
