import { useFormatter, useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { FlightsSummary } from "@/types/flights";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";
import { indexById } from "../engine-flight-hours/shared";
import { HoursByAircraftChart, ViolationsTrendChart } from "./summary-charts";

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function NoData() {
  const t = useTranslations("Flights.charts");
  return <p className="py-6 text-center text-sm text-foreground-2">{t("noData")}</p>;
}

export default function Charts({
  summary,
  aircraft,
  pilots,
}: {
  summary: FlightsSummary;
  aircraft: TrackedAircraft[];
  pilots: TrackedPilot[];
}) {
  const t = useTranslations("Flights");
  const format = useFormatter();

  const aircraftById = indexById(aircraft);
  const pilotsById = indexById(pilots);

  const hoursByAircraft = [...summary.hoursByAircraft]
    .sort((a, b) => b.flightHours - a.flightHours)
    .map((row) => ({
      name: aircraftById.get(row.aircraftId)?.name ?? row.aircraftId,
      flightHours: row.flightHours,
    }));

  const topPilots = [...summary.topPilots]
    .sort((a, b) => b.flightHours - a.flightHours)
    .map((row) => {
      const pilot = pilotsById.get(row.pilotId);
      return {
        ...row,
        name: pilot?.name ?? row.pilotId,
        initials: pilot?.initials ?? row.pilotId.slice(0, 2).toUpperCase(),
      };
    });

  return (
    <div className="space-y-6">
      <ChartCard title={t("charts.hoursByAircraft")}>
        {hoursByAircraft.length > 0 ? (
          <HoursByAircraftChart data={hoursByAircraft} />
        ) : (
          <NoData />
        )}
      </ChartCard>

      <ChartCard title={t("charts.violationsTrend")}>
        {summary.violationsTrend.length > 0 ? (
          <ViolationsTrendChart data={summary.violationsTrend} />
        ) : (
          <NoData />
        )}
      </ChartCard>

      <ChartCard title={t("charts.topPilots")}>
        {topPilots.length > 0 ? (
          <ul className="space-y-3">
            {topPilots.map((pilot) => (
              <li key={pilot.pilotId} className="flex items-center gap-3">
                <Avatar className="after:border-border">
                  <AvatarFallback className="bg-card-2 text-xs text-muted">
                    {pilot.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {pilot.name}
                </span>
                <span className="text-sm tabular-nums text-foreground-2">
                  {t("hoursValue", {
                    value: format.number(pilot.flightHours, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    }),
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <NoData />
        )}
      </ChartCard>
    </div>
  );
}
