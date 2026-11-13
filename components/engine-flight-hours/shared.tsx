import { Plane } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  Compliance,
  NextService,
  ServiceStatus,
} from "@/types/engine-flight-hours";
import type { TrackedAircraft } from "@/types/tracking";

/** Shown for a missing value. */
export const EMPTY = "—";

/**
 * Formats hours as "12.3h" (localized). `minimumFractionDigits: 0` drops a
 * trailing ".0" ("12h") where the value doesn't need to line up in a column.
 */
export function useHours({ minimumFractionDigits = 1 } = {}) {
  const t = useTranslations("EngineHours");
  const format = useFormatter();

  return (value: number) =>
    t("hoursValue", {
      value: format.number(value, {
        minimumFractionDigits,
        maximumFractionDigits: 1,
      }),
    });
}

const surfaceClassName = "rounded-xl bg-card ring-1 ring-foreground/10";

/** "No … yet" card shown instead of an empty list. */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "p-8 text-center text-sm text-foreground-2",
        surfaceClassName,
      )}
    >
      {children}
    </p>
  );
}

/** A bordered box inside the details sheet. */
export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card-2/40 p-3",
        className,
      )}
      {...props}
    />
  );
}

export type Column = { key: string; label: string; numeric?: boolean };

/** The card + header row shared by the pilots, daily log and maintenance tabs. */
export function HoursTable({
  columns,
  children,
}: {
  columns: Column[];
  /** The `<TableRow>`s. */
  children: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden", surfaceClassName)}>
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  "text-foreground first:ps-4 last:pe-4",
                  column.numeric && "text-end",
                )}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

export const rowClassName = "border-border hover:bg-card-2/50";

/** Registration with the aircraft's name below; the raw id when unknown. */
export function AircraftName({
  id,
  profile,
}: {
  id: string;
  profile: TrackedAircraft | undefined;
}) {
  return (
    <>
      <p className="font-medium text-foreground">
        {profile?.registration ?? id}
      </p>
      {profile?.name && (
        <p className="text-xs text-foreground-2">{profile.name}</p>
      )}
    </>
  );
}

/** Lookup by `id`, so table rows don't scan the whole list. */
export function indexById<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

const STATUS_STYLES: Record<ServiceStatus, { badge: string; bar: string }> = {
  onTrack: {
    badge: "border-success/30 bg-success/10 text-success",
    bar: "**:data-[slot=progress-indicator]:bg-success",
  },
  dueSoon: {
    badge: "border-primary/40 bg-primary/10 text-primary",
    bar: "**:data-[slot=progress-indicator]:bg-primary",
  },
  overdue: {
    badge: "border-danger/40 bg-danger/10 text-danger",
    bar: "**:data-[slot=progress-indicator]:bg-danger",
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

const COMPLIANCE_STYLES: Record<Compliance, string> = {
  compliant: "border-success/30 bg-success/10 text-success",
  warnings: "border-primary/40 bg-primary/10 text-primary",
  violation: "border-danger/40 bg-danger/10 text-danger",
};

export function ComplianceBadge({ compliance }: { compliance: Compliance }) {
  const t = useTranslations("EngineHours.compliance");

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        COMPLIANCE_STYLES[compliance] ?? COMPLIANCE_STYLES.compliant,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {t.has(compliance) ? t(compliance) : compliance}
    </Badge>
  );
}

/** Translated flight type, falling back to the raw API value. */
export function useFlightType() {
  const t = useTranslations("EngineHours.details.flightTypes");
  return (type: string) =>
    t.has(type as "training") ? t(type as "training") : type;
}

/** Translated service type ("50h" → "50-hour inspection"), falling back to the raw value. */
export function useServiceType() {
  const t = useTranslations("EngineHours.details.serviceTypes");
  return (type: string) =>
    t.has(type as "oilChange") ? t(type as "oilChange") : type;
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
          "**:data-[slot=progress-track]:h-1.5 **:data-[slot=progress-track]:bg-card-2",
          statusStyle(service.status).bar,
        )}
      />
    </div>
  );
}
