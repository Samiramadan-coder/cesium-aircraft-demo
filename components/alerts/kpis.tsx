import { useFormatter, useTranslations } from "next-intl";
import { cn } from "cn";
import type { KPIS } from "@/types/alerts";
import { useDuration } from "./shared";

export default function Kpis({ kpis }: { kpis: KPIS }) {
  const t = useTranslations("Alerts");
  const format = useFormatter();
  const duration = useDuration();

  const cards = [
    {
      key: "open",
      value: format.number(kpis.open),
      tone: kpis.open > 0 ? "text-danger" : undefined,
    },
    {
      key: "criticalOpen",
      value: format.number(kpis.criticalOpen),
      tone: kpis.criticalOpen > 0 ? "text-danger" : undefined,
    },
    { key: "triggeredToday", value: format.number(kpis.triggeredToday) },
    {
      key: "avgTimeToAcknowledge",
      value: duration(kpis.avgTimeToAcknowledgeSec),
    },
    { key: "avgTimeToResolve", value: duration(kpis.avgTimeToResolveSec) },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
  );
}
