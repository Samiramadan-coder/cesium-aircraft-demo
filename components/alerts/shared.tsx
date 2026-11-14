import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { AlertSeverity, AlertStatus, AlertUser } from "@/types/alerts";

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  info: "border-border bg-card-2/40 text-foreground-2",
  warning: "border-primary/40 bg-primary/10 text-primary",
  critical: "border-danger/40 bg-danger/10 text-danger",
};

const STATUS_STYLES: Record<AlertStatus, string> = {
  open: "border-danger/40 bg-danger/10 text-danger",
  acknowledged: "border-primary/40 bg-primary/10 text-primary",
  resolved: "border-success/30 bg-success/10 text-success",
};

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const t = useTranslations("Alerts.severity");
  const Icon =
    severity === "critical"
      ? CircleAlert
      : severity === "info"
        ? Info
        : TriangleAlert;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.warning,
      )}
    >
      <Icon />
      {t.has(severity) ? t(severity) : severity}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: AlertStatus }) {
  const t = useTranslations("Alerts.status");

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5", STATUS_STYLES[status] ?? STATUS_STYLES.open)}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {t.has(status) ? t(status) : status}
    </Badge>
  );
}

export const userName = (user: AlertUser) =>
  typeof user === "string" ? user : user.name;

/** Translated alert type ("signalLost" → "Signal Lost"), else the API's title. */
export function useAlertType() {
  const t = useTranslations("Alerts.types");
  return ({ type, title }: { type: string; title: string }) =>
    t.has(type as "signalLost") ? t(type as "signalLost") : title;
}

/** Seconds as the largest whole unit: "45s", "8m", "2h"; "—" for null. */
export function useDuration() {
  const t = useTranslations("Alerts");
  const format = useFormatter();

  return (seconds: number | null) => {
    if (seconds === null) return t("noValue");
    const [unit, value] =
      seconds < 60
        ? (["seconds", seconds] as const)
        : seconds < 3600
          ? (["minutes", seconds / 60] as const)
          : (["hours", seconds / 3600] as const);
    return t(`durations.${unit}`, {
      value: format.number(value, { maximumFractionDigits: 0 }),
    });
  };
}
