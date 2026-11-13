"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { useFormatter, useTranslations } from "next-intl";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { FlightsSummary } from "@/types/flights";

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex w-full justify-between gap-3">
      <span className="text-foreground-2">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </span>
  );
}

export function HoursByAircraftChart({
  data,
}: {
  /** Rows with the aircraft's display name already resolved. */
  data: { name: string; flightHours: number }[];
}) {
  const t = useTranslations("Flights");
  const format = useFormatter();

  const config = {
    flightHours: { label: t("charts.flightHours"), color: "var(--primary)" },
  } satisfies ChartConfig;

  const hours = (value: number) =>
    t("hoursValue", {
      value: format.number(value, { maximumFractionDigits: 1 }),
    });

  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      // One ~32px row per aircraft.
      style={{ height: Math.max(data.length * 32, 64) }}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 4, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          horizontal={false}
          strokeDasharray="3 3"
          stroke="var(--border)"
        />
        <XAxis type="number" dataKey="flightHours" hide />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={84}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
        />
        <ChartTooltip
          cursor={{ fill: "var(--card-2)" }}
          content={
            <ChartTooltipContent
              className="bg-card text-foreground"
              formatter={(value) => (
                <TooltipRow
                  label={t("charts.flightHours")}
                  value={hours(Number(value))}
                />
              )}
            />
          }
        />
        <Bar
          dataKey="flightHours"
          fill="var(--color-flightHours)"
          radius={3}
          maxBarSize={22}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function ViolationsTrendChart({
  data,
}: {
  data: FlightsSummary["violationsTrend"];
}) {
  const t = useTranslations("Flights.charts");
  const format = useFormatter();

  const config = {
    count: { label: t("violations"), color: "var(--danger)" },
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
      <LineChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="var(--border)"
        />
        <XAxis dataKey="date" hide />
        <YAxis hide allowDecimals={false} domain={[0, "dataMax + 1"]} />
        <ChartTooltip
          cursor={{ stroke: "var(--border)" }}
          content={
            <ChartTooltipContent
              className="bg-card text-foreground"
              labelFormatter={(_, payload) =>
                formatDay(String(payload?.[0]?.payload?.date ?? ""))
              }
              formatter={(value) => (
                <TooltipRow
                  label={t("violations")}
                  value={format.number(Number(value))}
                />
              )}
            />
          }
        />
        <Line
          dataKey="count"
          type="monotone"
          stroke="var(--color-count)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
