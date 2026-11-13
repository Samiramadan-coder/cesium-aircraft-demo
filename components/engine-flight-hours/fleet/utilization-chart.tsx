"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { useFormatter, useTranslations } from "next-intl";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { UtilizationDay } from "@/types/engine-flight-hours";

export default function UtilizationChart({ data }: { data: UtilizationDay[] }) {
  const t = useTranslations("EngineHours.details");
  const format = useFormatter();

  const config = {
    engineHours: { label: t("engineHours"), color: "var(--primary)" },
  } satisfies ChartConfig;

  // `date` is a calendar day; read it as UTC so it doesn't shift a day.
  const formatDay = (date: string) =>
    format.dateTime(new Date(`${date}T00:00:00Z`), {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

  return (
    <ChartContainer config={config} className="aspect-auto h-36 w-full">
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
          tickFormatter={formatDay}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
        />
        <ChartTooltip
          cursor={{ fill: "var(--card-2)" }}
          content={
            <ChartTooltipContent
              className="bg-card text-foreground"
              labelFormatter={(value) => formatDay(String(value))}
              formatter={(value) => (
                <span className="flex w-full justify-between gap-3">
                  <span className="text-foreground-2">{t("engineHours")}</span>
                  <span className="font-medium tabular-nums">
                    {t("hoursShort", {
                      value: format.number(Number(value), {
                        maximumFractionDigits: 1,
                      }),
                    })}
                  </span>
                </span>
              )}
            />
          }
        />
        <Bar
          dataKey="engineHours"
          fill="var(--color-engineHours)"
          radius={[3, 3, 0, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ChartContainer>
  );
}
