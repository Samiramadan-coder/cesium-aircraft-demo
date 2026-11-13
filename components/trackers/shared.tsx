import { Battery, BatteryFull, BatteryLow, BatteryMedium, Plane } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { TrackerStatus } from "@/types/trackers";
import type { TrackedAircraft } from "@/types/tracking";

const STATUS_STYLES: Record<TrackerStatus, string> = {
  online: "border-success/40 bg-success/10 text-success",
  offline: "border-danger/50 bg-danger/10 text-danger",
  notInstalled: "border-border bg-card-2/40 text-foreground-2",
};

export function TrackerStatusBadge({ status }: { status: TrackerStatus }) {
  const t = useTranslations("Trackers.statuses");

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        STATUS_STYLES[status] ?? STATUS_STYLES.notInstalled,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {t.has(status) ? t(status) : status}
    </Badge>
  );
}

const BARS = [0.4, 0.6, 0.8, 1];

/** Four signal bars plus the percentage. */
export function SignalStrength({ value }: { value: number | null }) {
  const format = useFormatter();

  if (value == null) return <span className="text-muted">—</span>;

  const filled = Math.ceil((Math.max(0, Math.min(100, value)) / 100) * BARS.length);

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-3.5 items-end gap-0.5" aria-hidden>
        {BARS.map((height, index) => (
          <span
            key={height}
            className={cn(
              "w-[3px] rounded-[1px]",
              index < filled ? "bg-success" : "bg-foreground/20",
            )}
            style={{ height: `${height * 100}%` }}
          />
        ))}
      </div>
      <span className="text-xs tabular-nums text-foreground-2">
        {format.number(value / 100, { style: "percent" })}
      </span>
    </div>
  );
}

export function BatteryLevel({ value }: { value: number | null }) {
  const format = useFormatter();

  if (value == null) return <span className="text-muted">—</span>;

  const Icon =
    value >= 75
      ? BatteryFull
      : value >= 40
        ? BatteryMedium
        : value >= 15
          ? BatteryLow
          : Battery;

  return (
    <div className="flex items-center gap-2">
      <Icon
        aria-hidden
        className={cn("size-4", value < 15 ? "text-danger" : "text-success")}
      />
      <span className="text-xs tabular-nums text-foreground-2">
        {format.number(value / 100, { style: "percent" })}
      </span>
    </div>
  );
}

export function AircraftCell({
  aircraft,
}: {
  aircraft: TrackedAircraft | null;
}) {
  const t = useTranslations("Trackers");

  if (!aircraft) {
    return <span className="text-foreground-2">{t("noAircraft")}</span>;
  }

  return (
    <div className="flex items-center gap-2.5">
      <Avatar>
        {aircraft.photoUrl && (
          <AvatarImage src={aircraft.photoUrl} alt={aircraft.name} />
        )}
        <AvatarFallback
          className="text-foreground"
          style={{ backgroundColor: aircraft.color ?? "var(--card-2)" }}
        >
          <Plane className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="font-medium text-foreground">{aircraft.registration}</p>
        <p className="truncate text-xs text-foreground-2">{aircraft.name}</p>
      </div>
    </div>
  );
}

/** Compares dotted versions numerically ("03.29.07" > "03.27.14"). */
export function compareVersions(a: string, b: string) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Accepts epoch ms, epoch seconds or a date string; null when unparsable,
 * so the formatter never gets an invalid date.
 */
export function toDate(value: number | string | null) {
  if (value == null || value === "") return null;
  const date =
    typeof value === "number"
      ? new Date(value < 1e12 ? value * 1000 : value)
      : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
