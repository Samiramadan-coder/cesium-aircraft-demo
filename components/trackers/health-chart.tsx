"use client";

import { Line, LineChart, YAxis } from "recharts";
import { useFormatter } from "next-intl";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/** One 0–100% series over time, drawn as a bare line with a hover tooltip. */
export default function HealthChart({
  data,
  label,
  color,
}: {
  data: { time: number; value: number }[];
  label: string;
  color: string;
}) {
  const format = useFormatter();
  const config = { value: { label, color } } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="aspect-auto h-24 w-full">
      <LineChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 8 }}>
        <YAxis hide domain={[0, 100]} />
        <ChartTooltip
          cursor={{ stroke: "var(--border)" }}
          content={
            <ChartTooltipContent
              className="bg-card text-foreground"
              labelFormatter={(_, payload) => {
                const time = payload?.[0]?.payload?.time;
                return time
                  ? format.dateTime(time, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : null;
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
