"use client";

import { Line, LineChart, XAxis, YAxis } from "recharts";
import { useFormatter, useNow } from "next-intl";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type HealthChartPoint = { hoursAgo: number; value: number };

const HOUR_MS = 3_600_000;

/** One 0–100% series over the last 24h, drawn as a bare line with a hover tooltip. */
export default function HealthChart({
  data,
  label,
  color,
}: {
  data: HealthChartPoint[];
  label: string;
  color: string;
}) {
  const format = useFormatter();
  const now = useNow();
  const config = { value: { label, color } } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="aspect-auto h-24 w-full">
      <LineChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 8 }}>
        {/* Oldest on the left; gaps stay proportional when hours are missing. */}
        <XAxis
          hide
          type="number"
          dataKey="hoursAgo"
          domain={[0, 24]}
          reversed
        />
        <YAxis hide domain={[0, 100]} />
        <ChartTooltip
          cursor={{ stroke: "var(--border)" }}
          content={
            <ChartTooltipContent
              className="bg-card text-foreground"
              labelFormatter={(_, payload) => {
                const hoursAgo = payload?.[0]?.payload?.hoursAgo;
                if (hoursAgo == null) return null;
                return hoursAgo === 0
                  ? format.relativeTime(now, now)
                  : format.relativeTime(
                      new Date(now.getTime() - hoursAgo * HOUR_MS),
                      now,
                    );
              }}
              formatter={(value) => (
                <span className="flex w-full justify-between gap-3">
                  <span className="text-foreground-2">{label}</span>
                  <span className="font-medium tabular-nums">
                    {format.number(Number(value) / 100, { style: "percent" })}
                  </span>
                </span>
              )}
            />
          }
        />
        <Line
          dataKey="value"
          type="monotone"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
