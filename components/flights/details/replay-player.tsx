"use client";

import { useCallback, useState } from "react";
import { Pause, Play, PlaneLanding, PlaneTakeoff, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { FlightZone } from "@/types/aircraft";
import type { FlightAlert, ReplayPoint } from "@/types/flights";
import dynamic from "next/dynamic";
import type { ReplayCamera, ReplayMapApi } from "./replay-map";
import TelemetryCharts from "./telemetry-charts";

// Cesium needs window/WebGL, so the map is loaded in the browser only.
const ReplayMap = dynamic(() => import("./replay-map"), { ssr: false });

const SPEEDS = [1, 2, 5, 10] as const;
const CAMERAS: ReplayCamera[] = ["follow", "overview", "topDown"];

/** "4:05", or "1:02:03" past an hour. */
function formatElapsed(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

/** A small segmented button group ("1x 2x 5x 10x", "Follow Overview Top-down"). */
function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format: (value: T) => string;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <span className="me-1 text-xs text-foreground-2">{label}</span>
      {options.map((option) => (
        <Button
          key={option}
          type="button"
          size="xs"
          variant="ghost"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={cn(
            "font-semibold text-foreground hover:bg-card-2",
            option === value && "bg-card-2",
          )}
        >
          {format(option)}
        </Button>
      ))}
    </div>
  );
}

export default function ReplayPlayer({
  points,
  zones,
  alerts,
  takeoffTime,
  landingTime,
  ceilingFt,
  googleMapsApiKey,
}: {
  points: ReplayPoint[];
  zones: FlightZone[];
  alerts: FlightAlert[];
  takeoffTime: number | null;
  landingTime: number | null;
  /** Drawn as a dashed line on the altitude chart. */
  ceilingFt?: number;
  googleMapsApiKey?: string;
}) {
  const t = useTranslations("Flights.details.player");

  const start = points[0]?.time ?? 0;
  const end = points.at(-1)?.time ?? start;
  const duration = Math.max(end - start, 1);

  const [mapApi, setMapApi] = useState<ReplayMapApi | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(5);
  const [camera, setCamera] = useState<ReplayCamera>("follow");
  const [time, setTime] = useState(start);

  const onEnded = useCallback(() => setPlaying(false), []);
  const onError = useCallback(() => setMapFailed(true), []);

  const seek = (to: number) => {
    const clamped = Math.min(Math.max(to, start), end);
    setTime(clamped);
    mapApi?.seek(clamped);
  };

  const togglePlaying = () => {
    // Starting again from the end begins at the start.
    if (!playing && time >= end) seek(start);
    setPlaying(!playing);
  };

  const percent = (at: number) => ((at - start) / duration) * 100;

  const markers = [
    ...(takeoffTime ? [{ key: "takeoff", at: takeoffTime, className: "bg-success" }] : []),
    ...alerts.map((alert) => ({
      key: alert.id,
      at: alert.triggeredAt,
      className: alert.severity === "critical" ? "bg-danger" : "bg-primary",
    })),
    ...(landingTime ? [{ key: "landing", at: landingTime, className: "bg-primary" }] : []),
  ].filter((marker) => marker.at >= start && marker.at <= end);

  if (points.length === 0) {
    return (
      <p className="rounded-xl bg-card p-8 text-center text-sm text-foreground-2 ring-1 ring-foreground/10">
        {t("noTrack")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative h-105 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {mapFailed ? (
          <p className="flex h-full items-center justify-center text-sm text-foreground-2">
            {t("mapUnavailable")}
          </p>
        ) : (
          <ReplayMap
            points={points}
            zones={zones}
            googleMapsApiKey={googleMapsApiKey}
            playing={playing}
            speed={speed}
            camera={camera}
            onTime={setTime}
            onEnded={onEnded}
            onReady={setMapApi}
            onError={onError}
          />
        )}
      </div>

      <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={t("restart")}
            onClick={() => {
              setPlaying(false);
              seek(start);
            }}
            className="border-border bg-card text-foreground hover:bg-card-2"
          >
            <RotateCcw />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            aria-label={playing ? t("pause") : t("play")}
            onClick={togglePlaying}
          >
            {playing ? <Pause /> : <Play />}
          </Button>

          {/* The visible track sits under a transparent native range input,
              which handles dragging, clicking and the keyboard. */}
          <div className="relative h-5 flex-1">
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-card-2" />
            <div
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
              style={{ insetInlineStart: 0, width: `${percent(time)}%` }}
            />
            {markers.map((marker) => (
              <span
                key={marker.key}
                className={cn(
                  "absolute top-1/2 size-2 -translate-y-1/2 rounded-full ring-2 ring-card rtl:translate-x-1/2 ltr:-translate-x-1/2",
                  marker.className,
                )}
                style={{ insetInlineStart: `${percent(marker.at)}%` }}
              />
            ))}
            <span
              className="pointer-events-none absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-foreground shadow ltr:-translate-x-1/2 rtl:translate-x-1/2"
              style={{ insetInlineStart: `${percent(time)}%` }}
            />
            <input
              type="range"
              aria-label={t("seek")}
              min={start}
              max={end}
              step={1000}
              value={time}
              onChange={(event) => seek(Number(event.target.value))}
              className="absolute inset-0 w-full cursor-pointer opacity-0"
            />
          </div>

          <span className="shrink-0 text-xs tabular-nums text-foreground-2" dir="ltr">
            {formatElapsed(time - start)} / {formatElapsed(end - start)}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            label={t("speed")}
            options={SPEEDS}
            value={speed as (typeof SPEEDS)[number]}
            onChange={setSpeed}
            format={(value) => `${value}x`}
          />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!takeoffTime}
              onClick={() => takeoffTime && seek(takeoffTime)}
              className="border-border bg-card text-foreground hover:bg-card-2"
            >
              <PlaneTakeoff />
              {t("takeoff")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!landingTime}
              onClick={() => landingTime && seek(landingTime)}
              className="border-border bg-card text-foreground hover:bg-card-2"
            >
              <PlaneLanding />
              {t("landing")}
            </Button>
          </div>

          <Segmented
            label={t("camera")}
            options={CAMERAS}
            value={camera}
            onChange={setCamera}
            format={(value) => t(`cameras.${value}`)}
          />
        </div>
      </div>

      <TelemetryCharts points={points} cursor={time} ceilingFt={ceilingFt} />
    </div>
  );
}
