"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "cn";
import { updateAlertRule } from "@/lib/actions/alerts";
import { ALERT_SEVERITIES } from "@/lib/search-params/alerts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { ErrorNotice } from "@/components/trackers/feedback";
import {
  ALERT_CHANNELS,
  type AlertChannel,
  type AlertRule,
  type AlertRulePayload,
  type AlertSeverity,
} from "@/types/alerts";
import {
  EmptyState,
  HoursTable,
  rowClassName,
} from "../engine-flight-hours/shared";
import { SeverityBadge, useAlertType } from "./shared";

const COLUMNS = [
  { key: "type" },
  { key: "severity" },
  { key: "threshold" },
  { key: "sound" },
  { key: "toast" },
  { key: "channels" },
  { key: "enabled" },
] as const;

const CHANNEL_ICONS: Record<AlertChannel, typeof Bell> = {
  operations: Bell,
  sms: MessageSquare,
  email: Mail,
};

/** The editable fields, as sent by `PUT /v1/tracking/alert-rules/{id}`. */
const toPayload = ({
  enabled,
  severity,
  sound,
  toast,
  channels,
}: AlertRule): AlertRulePayload => ({
  enabled,
  severity,
  sound,
  toast,
  channels,
});

/**
 * The alert rules; every change is saved at once. The row shows the new
 * value right away and goes back to the saved one if the request fails.
 */
export default function RulesTable({ rules }: { rules: AlertRule[] }) {
  const t = useTranslations("Alerts.rules");
  const alertType = useAlertType();
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(rules, (state, next: AlertRule) =>
    state.map((rule) => (rule.id === next.id ? next : rule)),
  );

  if (rules.length === 0) return <EmptyState>{t("empty")}</EmptyState>;

  function update(rule: AlertRule, changes: Partial<AlertRulePayload>) {
    const next = { ...rule, ...changes };
    setError(null);
    startTransition(async () => {
      setShown(next);
      const result = await updateAlertRule(rule.id, toPayload(next));
      if (!result.ok) setError(result.message);
    });
  }

  const toggleChannel = (rule: AlertRule, channel: AlertChannel) =>
    update(rule, {
      channels: rule.channels.includes(channel)
        ? rule.channels.filter((item) => item !== channel)
        : // Keep the API's order.
          ALERT_CHANNELS.filter(
            (item) => item === channel || rule.channels.includes(item),
          ),
    });

  return (
    <div className="space-y-4">
      {error && <ErrorNotice message={error} />}

      <HoursTable
        columns={COLUMNS.map((column) => ({
          ...column,
          label: t(`columns.${column.key}`),
        }))}
      >
        {shown.map((rule) => {
          const name = alertType({ type: rule.type, title: rule.type });

          return (
            <TableRow key={rule.id} className={rowClassName}>
              <TableCell className="ps-4 font-medium text-foreground">
                {name}
              </TableCell>

              <TableCell>
                <SeveritySelect
                  value={rule.severity}
                  label={t("severityLabel", { rule: name })}
                  onChange={(severity) => update(rule, { severity })}
                />
              </TableCell>

              <TableCell className="text-foreground-2">
                <Threshold rule={rule} />
              </TableCell>

              <TableCell>
                <Switch
                  checked={rule.sound}
                  aria-label={t("soundLabel", { rule: name })}
                  onCheckedChange={(sound) => update(rule, { sound })}
                />
              </TableCell>

              <TableCell>
                <Switch
                  checked={rule.toast}
                  aria-label={t("toastLabel", { rule: name })}
                  onCheckedChange={(toast) => update(rule, { toast })}
                />
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-1.5">
                  {ALERT_CHANNELS.map((channel) => {
                    const Icon = CHANNEL_ICONS[channel];
                    const on = rule.channels.includes(channel);
                    return (
                      <button
                        key={channel}
                        type="button"
                        aria-pressed={on}
                        aria-label={t(`channels.${channel}`)}
                        title={t(`channels.${channel}`)}
                        onClick={() => toggleChannel(rule, channel)}
                        className={cn(
                          "grid size-8 place-items-center rounded-md border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                          on
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-card-2/40 text-foreground-2 hover:bg-card-2 hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                      </button>
                    );
                  })}
                </div>
              </TableCell>

              <TableCell className="pe-4">
                <Switch
                  checked={rule.enabled}
                  aria-label={t("enabledLabel", { rule: name })}
                  onCheckedChange={(enabled) => update(rule, { enabled })}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </HoursTable>
    </div>
  );
}

/** The severity badge, which opens a menu to change it. */
function SeveritySelect({
  value,
  label,
  onChange,
}: {
  value: AlertSeverity;
  label: string;
  onChange: (value: AlertSeverity) => void;
}) {
  const t = useTranslations("Alerts.severity");
  const items = ALERT_SEVERITIES.map((severity) => ({
    value: severity,
    label: t(severity),
  }));

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next: AlertSeverity | null) =>
        next && next !== value && onChange(next)
      }
    >
      <SelectTrigger
        aria-label={label}
        className="h-auto border-none bg-transparent p-0 shadow-none hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent [&>svg:last-child]:hidden"
      >
        <SeverityBadge severity={value} />
      </SelectTrigger>
      <SelectContent className="bg-card text-foreground ring-border">
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            className="focus:bg-card-2 focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground"
          >
            <SeverityBadge severity={item.value} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** "Aircraft within 0.5 NM of a zone boundary", from the rule's threshold. */
function Threshold({ rule }: { rule: AlertRule }) {
  const t = useTranslations("Alerts.rules.thresholds");
  const format = useFormatter();
  const threshold = Array.isArray(rule.threshold) ? {} : rule.threshold;
  const number = (value: number | undefined) =>
    value == null ? "" : format.number(value);

  switch (rule.type) {
    case "nearBoundary":
      return t("nearBoundary", { value: number(threshold.lateralBufferNm) });
    case "outsideZone":
      return t("outsideZone");
    case "nearCeiling":
      return t("nearCeiling", { value: number(threshold.altitudeMarginFt) });
    case "ceilingExceeded":
      return t("ceilingExceeded");
    case "signalLost":
      return t("signalLost", { value: number(threshold.timeoutSec) });
    case "atzAltitudeWarning":
      return t("atzAltitudeWarning", { value: number(threshold.ceilingFt) });
    default:
      return <span className="text-muted">—</span>;
  }
}
