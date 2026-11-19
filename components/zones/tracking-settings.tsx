"use client";

import { useState } from "react";
import { Bell, LoaderCircle, Mail, MessageSquare, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { updateTrackingSettings } from "@/lib/actions/zones";
import {
  createTrackingSettingsSchema,
  type TrackingSettingsValues,
} from "@/lib/validations/tracking-settings";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";
import {
  applyServerErrors,
  controlClassName,
} from "@/components/form/form-controls";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/components/auth/permissions-provider";
import { Input } from "@/components/ui/input";
import { ErrorNotice, Notice } from "@/components/trackers/feedback";
import { ALERT_CHANNELS, type AlertChannel } from "@/types/alerts";
import type { TrackingSettings as Settings } from "@/types/tracking";

const FIELDS = [
  "signalLossTimeoutSec",
  "flightDetectionSpeedKt",
  "alertRecipients",
] as const;

const CHANNEL_ICONS: Record<AlertChannel, typeof Bell> = {
  operations: Bell,
  sms: MessageSquare,
  email: Mail,
};

const toValues = (settings: Settings): TrackingSettingsValues => ({
  signalLossTimeoutSec: settings.signalLossTimeoutSec,
  flightDetectionSpeedKt: settings.flightDetectionSpeedKt,
  alertRecipients: settings.alertRecipients,
});

/**
 * The club-wide tracking settings under the zones table: three editable
 * fields saved with `PUT /v1/tracking/settings`, and the rest read-only.
 */
export default function TrackingSettings({ settings }: { settings: Settings }) {
  const t = useTranslations("Zones.settings");
  const tChannels = useTranslations("Alerts.rules.channels");
  const [saved, setSaved] = useState(false);
  // Without it the settings are shown but can't be changed
  const locked = !usePermission("manageOperations");

  const {
    control,
    register,
    reset,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<TrackingSettingsValues>({
    resolver: zodResolver(createTrackingSettingsSchema((key) => t(`errors.${key}`))),
    defaultValues: toValues(settings),
  });

  async function onSubmit(values: TrackingSettingsValues) {
    setSaved(false);
    // Keep the API's channel order whatever order they were ticked in.
    const payload = {
      ...values,
      alertRecipients: ALERT_CHANNELS.filter((channel) =>
        values.alertRecipients.includes(channel),
      ),
    };
    const result = await updateTrackingSettings(payload);
    if (result.ok) {
      // The saved values are the new baseline, so "Save" turns off again.
      reset(payload);
      setSaved(true);
    } else {
      applyServerErrors(result, FIELDS, setError);
    }
  }

  const readOnly = [
    {
      key: "engineDetectionMethod",
      value: t.has(`engineMethods.${settings.engineDetectionMethod}` as "engineMethods.ignition")
        ? t(`engineMethods.${settings.engineDetectionMethod}` as "engineMethods.ignition")
        : settings.engineDetectionMethod,
    },
    {
      key: "dataRetentionMonths",
      value: t("monthsValue", { count: settings.dataRetentionMonths }),
    },
  ] as const;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      onChange={() => setSaved(false)}
      className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
    >
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 font-semibold text-foreground">
          <Settings2 className="size-4 text-foreground-2" />
          {t("title")}
        </h2>
        <p className="text-sm text-foreground-2">{t("description")}</p>
      </div>

      {errors.root?.server && (
        <ErrorNotice message={errors.root.server.message} />
      )}
      {saved && <Notice tone="success">{t("saved")}</Notice>}

      <fieldset disabled={locked} className="grid min-w-0 gap-4 md:grid-cols-3 disabled:[&_button]:pointer-events-none disabled:[&_button]:opacity-60">
        <LabeledField
          id="signalLossTimeoutSec"
          label={t("signalLossTimeoutSec")}
          error={errors.signalLossTimeoutSec}
          required
        >
          <div className="relative">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              dir="ltr"
              className={cn(controlClassName, "pe-12")}
              {...fieldA11yProps("signalLossTimeoutSec", errors.signalLossTimeoutSec)}
              {...register("signalLossTimeoutSec", { valueAsNumber: true })}
            />
            <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-foreground-2">
              {t("secondsUnit")}
            </span>
          </div>
        </LabeledField>

        <LabeledField
          id="flightDetectionSpeedKt"
          label={t("flightDetectionSpeedKt")}
          error={errors.flightDetectionSpeedKt}
          required
        >
          <div className="relative">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              dir="ltr"
              className={cn(controlClassName, "pe-12")}
              {...fieldA11yProps("flightDetectionSpeedKt", errors.flightDetectionSpeedKt)}
              {...register("flightDetectionSpeedKt", { valueAsNumber: true })}
            />
            <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-foreground-2">
              {t("knotsUnit")}
            </span>
          </div>
        </LabeledField>

        <Controller
          control={control}
          name="alertRecipients"
          render={({ field, fieldState: { error } }) => (
            <fieldset className="grid content-start gap-2">
              <legend className="mb-2 text-sm leading-snug font-medium">
                {t("alertRecipients")}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {ALERT_CHANNELS.map((channel) => {
                  const Icon = CHANNEL_ICONS[channel];
                  const on = field.value.includes(channel);
                  return (
                    <button
                      key={channel}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setSaved(false);
                        field.onChange(
                          on
                            ? field.value.filter((item) => item !== channel)
                            : [...field.value, channel],
                        );
                      }}
                      className={cn(
                        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
                        on
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border bg-card-2/40 text-foreground-2 hover:bg-card-2 hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {tChannels(channel)}
                    </button>
                  );
                })}
              </div>
              {error && (
                <p role="alert" className="text-xs text-danger">
                  {error.message}
                </p>
              )}
            </fieldset>
          )}
        />
      </fieldset>

      <dl className="grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
        {readOnly.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3 sm:block">
            <dt className="text-xs text-foreground-2">{t(item.key)}</dt>
            <dd className="text-sm font-medium tabular-nums text-foreground sm:mt-0.5">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      {!locked && (
        <div className="flex justify-end gap-2">
          {isDirty && (
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              className="border-border bg-card text-foreground hover:bg-card-2"
              onClick={() => reset(toValues(settings))}
            >
              {t("discard")}
            </Button>
        )}
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          {t("save")}
        </Button>
      </div>
      )}
    </form>
  );
}
