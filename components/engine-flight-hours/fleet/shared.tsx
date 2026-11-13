import { Plane } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { NextService, ServiceStatus } from "@/types/engine-flight-hours";
import type { TrackedAircraft } from "@/types/tracking";

/** Formats hours as "12.3h" (localized). */
export function useHours() {
  const t = useTranslations("EngineHours");
  const format = useFormatter();

  return (value: number) =>
    t("hoursValue", {
      value: format.number(value, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    });
}

const STATUS_STYLES: Record<ServiceStatus, { badge: string; bar: string }> = {
  onTrack: {
    badge: "border-success/30 bg-success/10 text-success",
    bar: "[&_[data-slot=progress-indicator]]:bg-success",
  },
  dueSoon: {
    badge: "border-primary/40 bg-primary/10 text-primary",
    bar: "[&_[data-slot=progress-indicator]]:bg-primary",
  },
  overdue: {
    badge: "border-danger/40 bg-danger/10 text-danger",
    bar: "[&_[data-slot=progress-indicator]]:bg-danger",
  },
};

function statusStyle(status: ServiceStatus) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.onTrack;
}

export function StatusBadge({ status }: { status: ServiceStatus }) {
  const t = useTranslations("EngineHours.status");

  return (
    <Badge variant="outline" className={cn("gap-1.5", statusStyle(status).badge)}>
      <span className="size-1.5 rounded-full bg-current" />
      {t.has(status) ? t(status) : status}
    </Badge>
  );
}

export function AircraftAvatar({
  profile,
  className,
}: {
  profile: TrackedAircraft | null;
  className?: string;
}) {
  return (
    <Avatar size="lg" className={cn("size-11 rounded-lg after:rounded-lg", className)}>
      {profile?.photoUrl && (
        <AvatarImage
          src={profile.photoUrl}
          alt={profile.name}
          className="rounded-lg"
        />
      )}
      <AvatarFallback
        className="rounded-lg text-foreground"
        style={{ backgroundColor: profile?.color ?? "var(--card-2)" }}
      >
        <Plane className="size-5" />
      </AvatarFallback>
    </Avatar>
  );
}

/** "Next service — 25.2h remaining" with a bar of hours used since the last service. */
export function ServiceProgress({
  service,
  label,
}: {
  service: NextService | null;
  label: string;
}) {
  const t = useTranslations("EngineHours");
  const hours = useHours();

  if (!service) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground-2">{label}</span>
        <span className="text-muted">{t("noSchedule")}</span>
      </div>
    );
  }

  const used =
    service.intervalHours > 0
      ? Math.min(100, (service.hoursSinceService / service.intervalHours) * 100)
      : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-foreground-2">{label}</span>
        <span className="font-medium text-foreground tabular-nums">
          {service.hoursRemaining < 0
            ? t("overdueBy", { value: hours(-service.hoursRemaining) })
            : t("remaining", { value: hours(service.hoursRemaining) })}
        </span>
      </div>
      <Progress
        value={used}
        aria-label={label}
        className={cn(
          "[&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-card-2",
          statusStyle(service.status).bar,
        )}
      />
    </div>
  );
}
