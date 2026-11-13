import { Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { KPIS } from "@/types/trackers";
import AddTracker from "./add-tracker";

export default function Header({ kpis }: { kpis: KPIS }) {
  const t = useTranslations("Trackers");
  const format = useFormatter();

  const percent = (value: number) =>
    format.number(value / 100, { style: "percent", maximumFractionDigits: 0 });

  const cards = [
    { key: "total", value: format.number(kpis.total) },
    { key: "online", value: format.number(kpis.online), tone: "text-success" },
    {
      key: "offline",
      value: format.number(kpis.offline),
      tone: kpis.offline > 0 ? "text-danger" : undefined,
    },
    { key: "notInstalled", value: format.number(kpis.notInstalled) },
    { key: "avgSignal", value: percent(kpis.avgSignal) },
    { key: "avgBattery", value: percent(kpis.avgBattery) },
    {
      key: "firmwareOutdated",
      value: format.number(kpis.firmwareOutdated),
      tone: kpis.firmwareOutdated > 0 ? "text-primary" : undefined,
    },
  ] as const;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
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

      <div className="flex flex-wrap items-center justify-end gap-3">
        <AddTracker
          trigger={
            <Button type="button" size="lg">
              <Plus />
              {t("addDevice")}
            </Button>
          }
        />
      </div>
    </section>
  );
}
