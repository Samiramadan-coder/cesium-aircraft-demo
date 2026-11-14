"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "cn";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import type { Alert } from "@/types/alerts";
import type {
  TrackedAircraft,
  TrackedPilot,
  TrackedZone,
} from "@/types/tracking";
import { Panel } from "../engine-flight-hours/shared";
import LocationThumbnail from "./location-thumbnail";
import {
  SeverityBadge,
  StatusBadge,
  useAlertType,
  useDuration,
  userName,
} from "./shared";

const DATE_TIME = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
} as const;

/** Side sheet with an alert's details, opened by clicking its row. */
export default function AlertSheet({
  alert,
  aircraft,
  pilot,
  zone,
  onClose,
}: {
  alert: Alert | null;
  aircraft: TrackedAircraft | undefined;
  pilot: TrackedPilot | undefined;
  zone: TrackedZone | undefined;
  onClose: () => void;
}) {
  const format = useFormatter();
  const alertType = useAlertType();

  // Keep showing the last alert while the sheet animates closed.
  const [shown, setShown] = useState(alert);
  if (alert && alert !== shown) setShown(alert);

  return (
    <Sheet open={!!alert} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto border-border bg-card text-foreground sm:max-w-md *:data-[slot=sheet-close]:text-foreground-2">
        {shown && (
          <>
            <SheetHeader className="items-start gap-1.5 p-4 pe-12">
              <div className="flex flex-wrap items-center gap-1.5">
                <SeverityBadge severity={shown.severity} />
                <StatusBadge status={shown.status} />
              </div>
              <SheetTitle className="text-lg font-semibold">
                {alertType(shown)}
              </SheetTitle>
              <SheetDescription className="text-foreground-2">
                {format.dateTime(shown.triggeredAt, DATE_TIME)}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-4">
              <Subject
                alert={shown}
                aircraft={aircraft}
                pilot={pilot}
                zone={zone}
              />
              <Stats alert={shown} />
              <Timeline alert={shown} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Location, aircraft and pilot, with a link to the flight. */
function Subject({
  alert,
  aircraft,
  pilot,
  zone,
}: {
  alert: Alert;
  aircraft: TrackedAircraft | undefined;
  pilot: TrackedPilot | undefined;
  zone: TrackedZone | undefined;
}) {
  const t = useTranslations("Alerts");
  const pilotName = pilot?.name ?? alert.pilotId;

  return (
    <Panel className="flex items-center gap-3">
      <LocationThumbnail
        point={{ lat: alert.lat, lon: alert.lon }}
        zone={zone}
        severity={alert.severity}
        label={alert.location ?? t("table.locationLabel", { id: alert.id })}
      />

      <Avatar size="sm" className="after:border-border">
        <AvatarFallback className="bg-card-2 text-[10px] text-muted">
          {pilot?.initials ??
            (alert.pilotId ?? alert.aircraftId).slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {aircraft?.registration ?? alert.aircraftId}
        </p>
        {pilotName && (
          <p className="text-xs text-foreground-2">
            {t("table.captain", { name: pilotName })}
          </p>
        )}
      </div>

      {alert.flightId && (
        <Link
          href={`/flights/${encodeURIComponent(alert.flightId)}`}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className:
              "shrink-0 border-border bg-card text-foreground hover:bg-card-2",
          })}
        >
          <Eye />
          {t("details.viewFlight")}
        </Link>
      )}
    </Panel>
  );
}

/** The measurements recorded with the alert; missing ones are left out. */
function Stats({ alert }: { alert: Alert }) {
  const t = useTranslations("Alerts.details");
  const format = useFormatter();
  const duration = useDuration();

  const feet = (value: number) =>
    t("feet", { value: format.number(value, { maximumFractionDigits: 0 }) });

  const stats = [
    alert.marginToCeilingFt != null && {
      key: "marginToCeiling" as const,
      value: feet(alert.marginToCeilingFt),
      tone: alert.marginToCeilingFt < 0 ? "text-danger" : undefined,
    },
    alert.altitudeFt != null && {
      key: "altitude" as const,
      value: feet(alert.altitudeFt),
    },
    alert.distanceToBoundaryNm != null && {
      key: "distanceToBoundary" as const,
      value: t("nauticalMiles", {
        value: format.number(alert.distanceToBoundaryNm, {
          maximumFractionDigits: 2,
        }),
      }),
      tone: alert.distanceToBoundaryNm < 0 ? "text-danger" : undefined,
    },
    alert.durationSec != null && {
      key: "duration" as const,
      value: duration(alert.durationSec),
    },
    alert.location && { key: "location" as const, value: alert.location },
  ].filter((stat) => !!stat);

  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <Panel key={stat.key}>
          <p className="text-xs text-foreground-2">{t(`stats.${stat.key}`)}</p>
          <p
            className={cn(
              "mt-1 font-semibold tabular-nums",
              "tone" in stat && stat.tone,
            )}
          >
            {stat.value}
          </p>
        </Panel>
      ))}
    </div>
  );
}

/** Triggered → acknowledged → resolved, as far as the alert has got. */
function Timeline({ alert }: { alert: Alert }) {
  const t = useTranslations("Alerts.details");
  const tResolution = useTranslations("Alerts.resolutions");
  const format = useFormatter();

  const resolution =
    alert.resolution &&
    (tResolution.has(alert.resolution as "falseAlarm")
      ? tResolution(alert.resolution as "falseAlarm")
      : alert.resolution);

  const events = [
    {
      key: "triggered",
      title: t("timeline.triggered"),
      at: alert.triggeredAt,
      dot: "bg-danger",
    },
    alert.acknowledgedAt != null && {
      key: "acknowledged",
      title: alert.acknowledgedBy
        ? t("timeline.acknowledgedBy", { name: userName(alert.acknowledgedBy) })
        : t("timeline.acknowledged"),
      at: alert.acknowledgedAt,
      note: alert.acknowledgedNote,
      dot: "bg-primary",
    },
    alert.resolvedAt != null && {
      key: "resolved",
      title: alert.resolvedBy
        ? t("timeline.resolvedBy", { name: userName(alert.resolvedBy) })
        : t("timeline.resolved"),
      at: alert.resolvedAt,
      note: [resolution, alert.resolutionNote].filter(Boolean).join(" — "),
      dot: "bg-success",
    },
  ].filter((event) => !!event);

  return (
    <section className="space-y-3">
      <h4 className="text-xs font-medium uppercase tracking-wide text-foreground-2">
        {t("timeline.title")}
      </h4>
      <ol className="space-y-3">
        {events.map((event) => (
          <li key={event.key} className="flex gap-3">
            <span
              className={cn("mt-1.5 size-2 shrink-0 rounded-full", event.dot)}
            />
            <div className="min-w-0">
              <p className="font-medium">{event.title}</p>
              <p className="text-xs text-foreground-2">
                {format.dateTime(event.at, DATE_TIME)}
              </p>
              {"note" in event && event.note && (
                <p className="mt-1 text-xs text-foreground-2">{event.note}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
