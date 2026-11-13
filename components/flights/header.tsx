import { useFormatter, useTranslations } from "next-intl";
import { cn } from "cn";
import type { KPIS } from "@/types/flights";
import ExportMenu from "./export-menu";

export default function Header({ kpis }: { kpis: KPIS }) {
  const t = useTranslations("Flights");
  const format = useFormatter();

  const hours = (value: number) =>
    t("hoursValue", {
      value: format.number(value, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    });

  const cards = [
    { key: "totalFlights", value: format.number(kpis.totalFlights) },
    { key: "totalFlightHours", value: hours(kpis.totalFlightHours) },
    { key: "totalEngineHours", value: hours(kpis.totalEngineHours) },
    {
      key: "complianceRate",
      value: format.number(kpis.complianceRate / 100, {
        style: "percent",
        maximumFractionDigits: 0,
      }),
      tone: kpis.complianceRate < 90 ? "text-danger" : "text-success",
    },
    {
      key: "flightsWithViolations",
      value: format.number(kpis.flightsWithViolations),
      tone: kpis.flightsWithViolations > 0 ? "text-danger" : undefined,
    },
    {
      key: "avgFlightDuration",
      value: t("minutesValue", {
        value: format.number(kpis.avgFlightDurationMin, {
          maximumFractionDigits: 0,
        }),
      }),
    },
  ] as const;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-foreground-2">{t("subtitle")}</p>
        </div>

        <ExportMenu />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <div
            key={card.key}
            className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10"
          >
            <p className="text-xs text-foreground-2">{t(`kpis.${card.key}`)}</p>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums text-foreground",
                "tone" in card && card.tone,
              )}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
