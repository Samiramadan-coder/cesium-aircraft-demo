import { useState } from "react";
import { ChevronUp, Plane } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Aircraft, AircraftZoneStatus } from "@/types/aircraft";
import { cn } from "@/lib/utils";

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <dt className="text-[0.65rem] font-medium tracking-widest text-muted-foreground uppercase rtl:tracking-normal">
        {label}
      </dt>
      <dd className="font-mono text-sm tabular-nums">{value}</dd>
    </div>
  );
}

type AircraftInfoPanelProps = {
  /** Every aircraft currently tracked, for the selector. */
  aircraftList: Aircraft[];
  /** The selected aircraft, or null while none is selected. */
  aircraft: Aircraft | null;
  /** The most relevant zone for the selected aircraft, or null if clear. */
  zoneStatus: AircraftZoneStatus | null;
  paused: boolean;
  onSelectAircraft: (id: string) => void;
};

export function AircraftInfoPanel({
  aircraftList,
  aircraft,
  zoneStatus,
  paused,
  onSelectAircraft,
}: AircraftInfoPanelProps) {
  const t = useTranslations("AircraftInfoPanel");
  const format = useFormatter();
  // Phones only: the secondary fields are folded away so the panel doesn't
  // cover the map. Always shown from `sm` up.
  const [expanded, setExpanded] = useState(false);
  const secondary = expanded ? undefined : "max-sm:hidden";

  const position = aircraft?.currentPosition ?? null;
  const name = aircraft ? (aircraft.callsign ?? aircraft.name) : t("noAircraft");
  const description = aircraft
    ? t("description", {
        name: aircraft.name,
        model: aircraft.modelUrl?.split("/").pop() ?? t("defaultModel"),
      })
    : aircraftList.length > 0
      ? t("selectAircraft")
      : t("waitingForData");
  const status = !position ? "acquiring" : paused ? "paused" : "live";

  const integer = (value: number) =>
    format.number(value, { maximumFractionDigits: 0 });
  const coordinate = (value: number) =>
    format.number(value, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
      useGrouping: false,
    });

  let zone = t("noValue");
  if (position) {
    if (!zoneStatus) zone = t("clearOfZones");
    else {
      const violation =
        zoneStatus.zone.type === "restricted" && zoneStatus.state === "inside";
      zone = t("zoneStatus", {
        zone: zoneStatus.zone.name,
        state: t(`zoneStates.${violation ? "violation" : zoneStatus.state}`),
      });
    }
  }

  return (
    <Card
      size="sm"
      className="w-full bg-card/80 shadow-xl backdrop-blur-md supports-backdrop-filter:bg-card/70 sm:w-72"
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex min-w-0 items-center gap-2 font-mono tracking-wide">
            <Plane className="size-4 shrink-0 text-sky-400" />
            <span className="truncate">{name}</span>
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            <Badge variant="outline" className="gap-1.5">
              <span
                className={
                  status === "live"
                    ? "size-1.5 rounded-full bg-emerald-400"
                    : "size-1.5 rounded-full bg-amber-400"
                }
              />
              {t(`status.${status}`)}
            </Badge>
            <Button
              size="icon-sm"
              variant="ghost"
              className="sm:hidden"
              aria-expanded={expanded}
              aria-label={expanded ? t("hideDetails") : t("showDetails")}
              onClick={() => setExpanded((value) => !value)}
            >
              <ChevronUp
                className={cn("transition-transform", expanded && "rotate-180")}
              />
            </Button>
          </div>
        </div>
        <CardDescription className={cn("text-xs", secondary)}>
          {description}
        </CardDescription>
        {aircraftList.length > 1 && (
          // One scrollable row on phones, wrapped grid of chips from `sm` up.
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pt-1 sm:mx-0 sm:max-h-24 sm:flex-wrap sm:overflow-x-visible sm:overflow-y-auto sm:px-0 *:shrink-0">
            {aircraftList.map(({ id, name, callsign }) => (
              <Button
                key={id}
                size="xs"
                variant={id === aircraft?.id ? "default" : "outline"}
                aria-pressed={id === aircraft?.id}
                className="font-mono"
                onClick={() => onSelectAircraft(id)}
              >
                {callsign ?? name}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      <Separator />
      <CardContent>
        <dl className="grid grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-2">
          <Field
            label={t("fields.altitude")}
            value={
              position
                ? t("units.feet", { value: integer(position.altitude) })
                : t("noValue")
            }
          />
          <Field
            label={t("fields.groundSpeed")}
            value={
              position
                ? t("units.knots", { value: integer(position.speed) })
                : t("noValue")
            }
          />
          <Field
            label={t("fields.heading")}
            value={
              position
                ? t("units.degrees", {
                    value: format.number(Math.round(position.heading) % 360, {
                      minimumIntegerDigits: 3,
                      useGrouping: false,
                    }),
                  })
                : t("noValue")
            }
          />
          <Field
            label={t("fields.lastUpdate")}
            className={secondary}
            value={
              position
                ? t("units.utcTime", {
                    time: format.dateTime(position.timestamp, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hourCycle: "h23",
                      timeZone: "UTC",
                    }),
                  })
                : t("noValue")
            }
          />
          <Field
            label={t("fields.latitude")}
            className={secondary}
            value={position ? coordinate(position.lat) : t("noValue")}
          />
          <Field
            label={t("fields.longitude")}
            className={secondary}
            value={position ? coordinate(position.lng) : t("noValue")}
          />
          <Field label={t("fields.zone")} className="col-span-full" value={zone} />
        </dl>
      </CardContent>
    </Card>
  );
}
