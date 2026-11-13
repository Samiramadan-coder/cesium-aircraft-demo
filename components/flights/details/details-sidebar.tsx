import {
  CircleAlert,
  CircleCheck,
  Gauge,
  MapPin,
  PlaneTakeoff,
  Timer,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "cn";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Flight, FlightAlert } from "@/types/flights";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";
import { ComplianceBadge, EMPTY, useFlightType } from "../../engine-flight-hours/shared";

const cardClassName = "rounded-xl bg-card p-4 ring-1 ring-foreground/10";

function Card({
  title,
  className,
  children,
}: {
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(cardClassName, className)}>
      {title && (
        <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      )}
      {children}
    </section>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className={cardClassName}>
      <Icon className="size-4 text-foreground-2" />
      <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      <p className="text-xs text-foreground-2">{label}</p>
    </div>
  );
}

export default function DetailsSidebar({
  flight,
  aircraft,
  pilot,
  alerts,
}: {
  flight: Flight;
  aircraft: TrackedAircraft | undefined;
  pilot: TrackedPilot | undefined;
  alerts: FlightAlert[];
}) {
  const t = useTranslations("Flights");
  const format = useFormatter();
  const flightType = useFlightType();

  const time = (ms: number | null) =>
    ms ? format.dateTime(ms, { hour: "numeric", minute: "2-digit" }) : EMPTY;

  const engineTimes = [
    { key: "engineStart", value: flight.engineStartTime },
    { key: "takeoff", value: flight.takeoffTime },
    { key: "landing", value: flight.landingTime },
    { key: "engineShutdown", value: flight.engineShutdownTime },
  ] as const;

  const sortedAlerts = [...alerts].sort((a, b) => a.triggeredAt - b.triggeredAt);

  return (
    <aside className="space-y-4">
      <Card title={t("details.aircraft")}>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-card-2 text-foreground-2">
            <PlaneTakeoff className="size-5" />
          </span>
          <div>
            <p className="font-medium text-foreground">
              {aircraft?.registration ?? flight.aircraftId}
            </p>
            <p className="text-xs text-foreground-2">
              {aircraft?.name ?? flight.aircraftType}
            </p>
          </div>
        </div>
      </Card>

      <Card title={t("details.pilot")}>
        {flight.pilotId ? (
          <div className="flex items-center gap-3">
            <Avatar size="lg" className="after:border-border">
              <AvatarFallback className="bg-card-2 text-xs text-muted">
                {pilot?.initials ?? flight.pilotId.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">
                {pilot?.name ?? flight.pilotId}
              </p>
              {flight.bookingRef && (
                <p className="text-xs text-foreground-2">{flight.bookingRef}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground-2">{t("details.noPilot")}</p>
        )}
      </Card>

      <Card title={t("details.date")}>
        <p className="font-medium text-foreground">
          {format.dateTime(flight.engineStartTime, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        <p className="text-xs text-foreground-2">{flightType(flight.flightType)}</p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Stat
          icon={Timer}
          label={t("details.stats.flightTime")}
          value={t("table.minutesShort", {
            value: format.number(flight.flightTimeMin, { maximumFractionDigits: 0 }),
          })}
        />
        <Stat
          icon={Gauge}
          label={t("details.stats.engineTime")}
          value={t("table.minutesShort", {
            value: format.number(flight.engineTimeMin, { maximumFractionDigits: 0 }),
          })}
        />
        <Stat
          icon={TrendingUp}
          label={t("details.stats.maxAltitude")}
          value={t("table.feet", { value: format.number(flight.maxAltitudeFt) })}
        />
        <Stat
          icon={MapPin}
          label={t("details.stats.distance")}
          value={t("table.nauticalMiles", {
            value: format.number(flight.distanceNm, { maximumFractionDigits: 1 }),
          })}
        />
      </div>

      <Card title={t("details.engine.title")}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {engineTimes.map((item) => (
            <div key={item.key}>
              <dt className="text-xs text-foreground-2">
                {t(`details.engine.${item.key}`)}
              </dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {time(item.value)}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title={t("details.compliance.title")}>
        <ComplianceBadge compliance={flight.compliance} />

        <div
          className={cn(
            "mt-3 flex gap-2.5 rounded-lg bg-card-2/40 p-3 text-sm",
            flight.compliance === "compliant" && "text-foreground-2",
            flight.compliance === "warnings" && "text-primary",
            flight.compliance === "violation" && "text-danger",
          )}
        >
          {flight.compliance === "compliant" ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
          ) : (
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
          )}
          <p>{t(`details.compliance.${flight.compliance}`)}</p>
        </div>

        <h3 className="mt-4 mb-2 text-xs text-foreground-2">
          {t("details.zoneEvents.title")}
        </h3>
        {sortedAlerts.length === 0 ? (
          <p className="text-sm text-foreground">{t("details.zoneEvents.empty")}</p>
        ) : (
          <ul className="space-y-2.5">
            {sortedAlerts.map((alert) => (
              <li key={alert.id} className="flex gap-2.5 text-sm">
                <TriangleAlert
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    alert.severity === "critical" ? "text-danger" : "text-primary",
                  )}
                />
                <div className="min-w-0">
                  <p className="text-foreground">{alert.title}</p>
                  <p className="text-xs text-foreground-2">
                    {time(alert.triggeredAt)}
                    {alert.durationSec != null && (
                      <>
                        {" · "}
                        {t("details.zoneEvents.duration", {
                          value: format.number(alert.durationSec / 60, {
                            maximumFractionDigits: 1,
                          }),
                        })}
                      </>
                    )}
                    {alert.location && <> · {alert.location}</>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </aside>
  );
}
