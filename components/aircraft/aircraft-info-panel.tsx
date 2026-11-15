import { useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronUp,
  Locate,
  LocateFixed,
  Minus,
  Plane,
} from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AircraftEventList } from "@/components/aircraft/aircraft-events";
import { airborneSince } from "@/lib/aircraft/events";
import type {
  Aircraft,
  AircraftEvent,
  AircraftZoneStatus,
} from "@/types/aircraft";
import { cn } from "@/lib/utils";

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-px", className)}>
      <dt className="text-[0.55rem] leading-tight font-medium tracking-widest text-muted-foreground uppercase rtl:tracking-normal">
        {label}
      </dt>
      <dd className="font-mono text-[0.7rem] leading-snug tabular-nums">{value}</dd>
    </div>
  );
}

/** Vertical speed beyond which the aircraft counts as climbing / descending. */
const LEVEL_FLIGHT_FPM = 50;

const COMPASS_POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

/** Dot color of each tracking status; anything unknown is gray. */
const STATUS_DOT: Record<string, string> = {
  normal: "bg-emerald-400",
  onGround: "bg-sky-400",
  nearBoundary: "bg-amber-400",
  nearCeiling: "bg-amber-400",
  atzAltitudeWarning: "bg-amber-400",
  ceilingExceeded: "bg-red-500",
  outsideZone: "bg-red-500",
  signalLost: "bg-zinc-400",
};

type AircraftInfoPanelProps = {
  /** Every aircraft currently tracked, for the selector. */
  aircraftList: Aircraft[];
  /** The selected aircraft, or null while none is selected. */
  aircraft: Aircraft | null;
  /** The most relevant zone for the selected aircraft, or null if clear. */
  zoneStatus: AircraftZoneStatus | null;
  paused: boolean;
  /**
   * No position for this long shows the aircraft as "signal lost"; never
   * when omitted.
   */
  signalLossTimeoutSec?: number;
  /** Whether the camera is following the selected aircraft. */
  following: boolean;
  onToggleFollow: () => void;
  /** Recent events of the selected aircraft, oldest first. */
  events: AircraftEvent[];
  /** Ids of the events whose position is known. */
  locatableEvents: Set<string>;
  /** Called when an event is clicked, to show where it happened. */
  onSelectEvent: (event: AircraftEvent) => void;
  onSelectAircraft: (id: string) => void;
};

export function AircraftInfoPanel({
  aircraftList,
  aircraft,
  zoneStatus,
  paused,
  signalLossTimeoutSec,
  following,
  onToggleFollow,
  events,
  locatableEvents,
  onSelectEvent,
  onSelectAircraft,
}: AircraftInfoPanelProps) {
  const t = useTranslations("AircraftInfoPanel");
  const format = useFormatter();
  // Re-checks for a lost signal and refreshes "x min ago".
  const now = useNow({ updateInterval: 5_000 });
  // Phones only: the secondary fields are folded away so the panel doesn't
  // cover the map. Always shown from `sm` up.
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"details" | "events">("details");
  const secondary = expanded ? undefined : "max-sm:hidden";

  const position = aircraft?.currentPosition ?? null;
  const details = aircraft?.details;
  const name = aircraft
    ? (aircraft.callsign ?? aircraft.name)
    : t("noAircraft");
  const description = aircraft
    ? t("description", {
        name: aircraft.name,
        model:
          details?.type ??
          aircraft.modelUrl?.split("/").pop() ??
          t("defaultModel"),
      })
    : aircraftList.length > 0
      ? t("selectAircraft")
      : t("waitingForData");
  const signalLost =
    position != null &&
    signalLossTimeoutSec != null &&
    now.getTime() - position.timestamp > signalLossTimeoutSec * 1000;
  const status = !position
    ? "acquiring"
    : signalLost
      ? "lastKnown"
      : paused
        ? "paused"
        : "live";

  // Only trusted while the aircraft is reporting and not on the ground.
  const takeoffTime =
    !signalLost && details?.status !== "onGround"
      ? airborneSince(events)
      : null;
  let flight: string = details?.flightId ?? t("noValue");
  if (takeoffTime !== null) {
    flight = t("airborneSince", {
      flight: details?.flightId ?? t("noValue"),
      duration: format.relativeTime(takeoffTime, now),
    });
  }

  const integer = (value: number) =>
    format.number(value, { maximumFractionDigits: 0 });
  const coordinate = (value: number) =>
    format.number(value, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
      useGrouping: false,
    });

  const percent = (value: number | null | undefined) =>
    value == null
      ? t("noValue")
      : t("units.percent", { value: integer(value) });

  const trackingStatus = signalLost ? "signalLost" : details?.status;
  // Statuses the API may add later are shown as sent.
  const statusKey =
    `trackingStatus.${trackingStatus}` as "trackingStatus.normal";
  const trackingStatusLabel = trackingStatus
    ? t.has(statusKey)
      ? t(statusKey)
      : trackingStatus
    : null;

  const verticalSpeed = details?.verticalSpeedFpm;
  let vertical: ReactNode = t("noValue");
  if (verticalSpeed != null) {
    const trend =
      verticalSpeed > LEVEL_FLIGHT_FPM
        ? "climbing"
        : verticalSpeed < -LEVEL_FLIGHT_FPM
          ? "descending"
          : "level";
    const Icon =
      trend === "climbing"
        ? ArrowUp
        : trend === "descending"
          ? ArrowDown
          : Minus;
    vertical = (
      <span className="inline-flex items-center gap-1">
        <Icon className="size-3.5" />
        {t(`vertical.${trend}`)}
      </span>
    );
  }

  const boundary = details?.distanceToBoundaryNm;

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
      className="w-full bg-card/80 shadow-xl backdrop-blur-md supports-backdrop-filter:bg-card/70 sm:min-h-0 sm:w-72"
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex min-w-0 items-center gap-2 font-mono tracking-wide">
            {details?.photoUrl ? (
              <Avatar size="sm" className="rounded-md after:rounded-md">
                <AvatarImage
                  src={details.photoUrl}
                  alt={aircraft?.name}
                  className="rounded-md"
                />
                <AvatarFallback className="rounded-md">
                  <Plane className="size-3.5 text-sky-400" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <Plane className="size-4 shrink-0 text-sky-400" />
            )}
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
            {aircraft && (
              <Button
                size="icon-sm"
                variant={following ? "default" : "ghost"}
                aria-pressed={following}
                aria-label={following ? t("unfollow") : t("follow")}
                title={following ? t("unfollow") : t("follow")}
                onClick={onToggleFollow}
              >
                {following ? <LocateFixed /> : <Locate />}
              </Button>
            )}
            <Button
              size="icon-sm"
              variant="ghost"
              className="sm:hidden"
              aria-expanded={expanded}
              aria-label={expanded ? t("hideDetails") : t("showDetails")}
              onClick={() => {
                // Folding shows only the main fields, so back to that tab.
                if (expanded) setTab("details");
                setExpanded(!expanded);
              }}
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
        {trackingStatusLabel && (
          <Badge variant="secondary" className="w-fit gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full",
                STATUS_DOT[trackingStatus!] ?? "bg-zinc-400",
              )}
            />
            {trackingStatusLabel}
          </Badge>
        )}
        {aircraftList.length > 1 && (
          // One scrollable row on phones, wrapped grid of chips from `sm` up.
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pt-1 sm:mx-0 sm:max-h-24 sm:flex-wrap sm:overflow-x-visible sm:overflow-y-auto sm:px-0 *:shrink-0">
            {aircraftList.map(({ id, name, callsign }) => (
              <Button
                key={id}
                size="xs"
                variant={id === aircraft?.id ? "default" : "outline"}
                aria-pressed={id === aircraft?.id}
                className="h-5 px-1.5 font-mono text-[0.65rem]"
                onClick={() => onSelectAircraft(id)}
              >
                {callsign ?? name}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      <Separator />
      {/* Header and tabs stay put; only the open tab scrolls. */}
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as "details" | "events")}
          className="min-h-0 flex-1 gap-3"
        >
          {aircraft && (
            <TabsList className={cn("w-full shrink-0", secondary)}>
              <TabsTrigger value="details" className="text-xs">
                {t("tabs.details")}
              </TabsTrigger>
              <TabsTrigger value="events" className="text-xs">
                {t("tabs.events")}
                {events.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 text-[0.65rem] tabular-nums">
                    {format.number(events.length)}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          )}
          <TabsContent
            value="details"
            className="min-h-0 overflow-y-auto pe-1 [scrollbar-color:var(--color-border)_transparent] [scrollbar-width:thin] max-sm:max-h-[40dvh]"
          >
            <dl className="grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-2">
              <Field
                label={t("fields.altitude")}
                value={
                  position
                    ? t("units.feetAmsl", { value: integer(position.altitude) })
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
                    ? t("units.heading", {
                        point: t(
                          `compass.${COMPASS_POINTS[Math.round((((position.heading % 360) + 360) % 360) / 45) % 8]}`,
                        ),
                        value: format.number(
                          Math.round(position.heading) % 360,
                          {
                            minimumIntegerDigits: 3,
                            useGrouping: false,
                          },
                        ),
                      })
                    : t("noValue")
                }
              />
              <Field
                label={t("fields.heightAgl")}
                className={secondary}
                value={
                  details?.heightAglFt != null
                    ? t("units.feet", {
                        value: integer(Math.max(0, details.heightAglFt)),
                      })
                    : t("noValue")
                }
              />
              <Field
                label={t("fields.vertical")}
                className={secondary}
                value={vertical}
              />
              <Field
                label={t("fields.boundary")}
                className={secondary}
                value={
                  boundary != null
                    ? t("units.nauticalMiles", {
                        value: format.number(boundary, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                          signDisplay: "exceptZero",
                        }),
                      })
                    : t("noValue")
                }
              />
              <Field
                label={t("fields.pilot")}
                className={secondary}
                value={details?.pilotName ?? t("noValue")}
              />
              <Field
                label={t("fields.engine")}
                className={secondary}
                value={
                  details?.engineOn == null
                    ? t("noValue")
                    : t(details.engineOn ? "engine.on" : "engine.off")
                }
              />
              <Field
                label={t("fields.signal")}
                className={secondary}
                value={percent(details?.signalStrength)}
              />
              <Field
                label={t("fields.battery")}
                className={secondary}
                value={percent(details?.batteryPercent)}
              />
              <Field
                label={t("fields.flight")}
                className={cn("col-span-full", secondary)}
                value={flight}
              />
              <Field
                label={t("fields.tracker")}
                className={cn("col-span-full", secondary)}
                value={details?.trackerModel ?? t("noValue")}
              />
              <Field
                label={t("fields.lastUpdate")}
                className={cn("col-span-full", secondary)}
                value={
                  position
                    ? t("units.utcTimeAgo", {
                        time: format.dateTime(position.timestamp, {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hourCycle: "h23",
                          timeZone: "UTC",
                        }),
                        ago: format.relativeTime(position.timestamp, now),
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
              <Field
                label={t("fields.zone")}
                className="col-span-full"
                value={zone}
              />
            </dl>
          </TabsContent>
          <TabsContent
            value="events"
            className="min-h-0 overflow-y-auto pe-1 [scrollbar-color:var(--color-border)_transparent] [scrollbar-width:thin] max-sm:max-h-[40dvh]"
          >
            <AircraftEventList
              events={events}
              locatable={locatableEvents}
              onSelectEvent={onSelectEvent}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
