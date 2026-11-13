"use client";

import { memo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { useFormatter, useTranslations } from "next-intl";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ReplayPoint } from "@/types/flights";

type Metric = "altitudeFt" | "groundSpeedKt" | "distanceFromOmefNm";

const CHARTS = [
  { key: "altitudeFt", label: "altitude", color: "var(--primary)" },
  { key: "groundSpeedKt", label: "groundSpeed", color: "#4f9bd9" },
  { key: "distanceFromOmefNm", label: "distance", color: "var(--success)" },
] as const;

const TelemetryChart = memo(function TelemetryChart({
  points,
  metric,
  label,
  color,
  cursor,
  ceilingFt,
}: {
  points: ReplayPoint[];
  metric: Metric;
  label: string;
  color: string;
  /** Replay time (Unix ms) marked with a vertical line. */
  cursor: number;
  ceilingFt?: number;
}) {
  const t = useTranslations("Flights.details.telemetry");
  const format = useFormatter();

  const config = { [metric]: { label, color } } satisfies ChartConfig;

  return (
    <section className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h3 className="text-xs font-medium text-foreground-2">{label}</h3>
      <ChartContainer config={config} className="aspect-auto h-28 w-full">
        <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            hide
          />
          <YAxis
            hide
            domain={[0, (max: number) => Math.max(max, ceilingFt ?? 0) * 1.1]}
          />
          {ceilingFt !== undefined && (
            <ReferenceLine
              y={ceilingFt}
              stroke="var(--danger)"
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
              label={{
                value: t("ceiling", { value: format.number(ceilingFt) }),
                position: "insideTopRight",
                fill: "var(--muted)",
                fontSize: 10,
              }}
            />
          )}
          <ReferenceLine x={cursor} stroke="var(--foreground-2)" strokeOpacity={0.6} />
          <ChartTooltip
            cursor={{ stroke: "var(--border)" }}
            content={
              <ChartTooltipContent
                className="bg-card text-foreground"
                labelFormatter={(_, payload) =>
                  format.dateTime(Number(payload?.[0]?.payload?.time ?? 0), {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                }
                formatter={(value) => (
                  <span className="font-medium tabular-nums">
                    {format.number(Number(value), { maximumFractionDigits: 1 })}
                  </span>
                )}
              />
            }
          />
          <Area
            dataKey={metric}
            type="linear"
            stroke={`var(--color-${metric})`}
            strokeWidth={1.5}
            fill={`var(--color-${metric})`}
            fillOpacity={0.15}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ChartContainer>
    </section>
  );
});

export default function TelemetryCharts({
  points,
  cursor,
  ceilingFt,
}: {
  points: ReplayPoint[];
  cursor: number;
  ceilingFt?: number;
}) {
  const t = useTranslations("Flights.details.telemetry");

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {CHARTS.map((chart) => (
        <TelemetryChart
          key={chart.key}
          points={points}
          metric={chart.key}
          label={t(chart.label)}
          color={chart.color}
          cursor={cursor}
          ceilingFt={chart.key === "altitudeFt" ? ceilingFt : undefined}
        />
      ))}
    </div>
  );
}
