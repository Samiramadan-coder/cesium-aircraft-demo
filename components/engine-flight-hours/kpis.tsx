import { useFormatter, useTranslations } from "next-intl";
import type { KPIS } from "@/types/engine-flight-hours";
import { useHours } from "./shared";

/** The KPI cards; rendered by each tab so they follow `?period=`. */
export default function Kpis({ kpis }: { kpis: KPIS }) {
  const t = useTranslations("EngineHours");
  const format = useFormatter();
  const hours = useHours({ minimumFractionDigits: 0 });

  const dueForService = kpis.dueSoonCount + kpis.overdueCount;

  const cards = [
    { key: "flightHours", value: hours(kpis.totalFlightHours) },
    { key: "engineHours", value: hours(kpis.totalEngineHours) },
    { key: "totalFlights", value: format.number(kpis.totalFlights) },
    { key: "avgUtilization", value: hours(kpis.avgUtilizationHours) },
    {
      key: "dueForService",
      value: format.number(dueForService),
      note:
        kpis.overdueCount > 0
          ? t("overdue", { count: kpis.overdueCount })
          : undefined,
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10"
        >
          <p className="text-xs text-foreground-2">{t(`kpis.${card.key}`)}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {card.value}
          </p>
          {"note" in card && card.note && (
            <p className="mt-0.5 text-xs text-destructive">{card.note}</p>
          )}
        </div>
      ))}
    </div>
  );
}
