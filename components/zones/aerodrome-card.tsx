"use client";

import { useState } from "react";
import { LoaderCircle, PlaneLanding } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateAerodrome } from "@/lib/actions/zones";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";
import {
  applyServerErrors,
  controlClassName,
} from "@/components/form/form-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorNotice, Notice } from "@/components/trackers/feedback";
import type { Aerodrome, LatLon } from "@/types/tracking";

const MAX_NAME_LENGTH = 100;

/** "24.46620, 55.62492" — five decimals is about a metre. */
function formatLatLon({ lat, lon }: LatLon) {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

/**
 * The home aerodrome from `GET /v1/aerodrome`. Only the name is editable
 * (`PUT /v1/aerodrome`); the rest is shown for reference.
 */
export default function AerodromeCard({ aerodrome }: { aerodrome: Aerodrome }) {
  const t = useTranslations("Zones.aerodrome");
  const format = useFormatter();
  const [saved, setSaved] = useState(false);

  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, t("errors.nameRequired"))
      .max(MAX_NAME_LENGTH, t("errors.nameTooLong", { max: MAX_NAME_LENGTH })),
  });

  const {
    register,
    reset,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: aerodrome.name },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    setSaved(false);
    const result = await updateAerodrome(values);
    if (result.ok) {
      reset(values);
      setSaved(true);
    } else {
      applyServerErrors(result, ["name"], setError);
    }
  }

  const heading = `${String(Math.round(aerodrome.runwayHeadingDeg) % 360).padStart(3, "0")}°`;
  const runways = aerodrome.runwayThresholds
    .map((runway) => runway.designator)
    .join("/");

  const details = [
    { key: "icao", value: aerodrome.icao, ltr: true },
    {
      key: "elevation",
      value: t("feetValue", { value: format.number(aerodrome.elevationFt) }),
    },
    {
      key: "runway",
      value: runways ? `${runways} · ${heading}` : heading,
      ltr: true,
    },
    {
      key: "referencePoint",
      value: formatLatLon(aerodrome.referencePoint),
      ltr: true,
    },
    ...aerodrome.runwayThresholds.map((runway) => ({
      key: `threshold-${runway.designator}`,
      label: t("threshold", { designator: runway.designator }),
      value: formatLatLon(runway.threshold),
      ltr: true,
    })),
    {
      key: "circuit",
      value: t("circuitPoints", { count: aerodrome.circuitPattern.length }),
    },
  ];

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
    >
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 font-semibold text-foreground">
          <PlaneLanding className="size-4 text-foreground-2" />
          {t("title")}
        </h2>
        <p className="text-sm text-foreground-2">{t("description")}</p>
      </div>

      {errors.root?.server && (
        <ErrorNotice message={errors.root.server.message} />
      )}
      {saved && <Notice tone="success">{t("saved")}</Notice>}

      <div className="flex flex-wrap items-end gap-3">
        <LabeledField
          id="aerodrome-name"
          label={t("name")}
          error={errors.name}
          required
          className="min-w-0 flex-1 sm:max-w-sm"
        >
          <Input
            autoComplete="off"
            className={controlClassName}
            {...fieldA11yProps("aerodrome-name", errors.name)}
            {...register("name", { onChange: () => setSaved(false) })}
          />
        </LabeledField>
        {isDirty && (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            className="border-border bg-card text-foreground hover:bg-card-2"
            onClick={() => reset({ name: aerodrome.name })}
          >
            {t("discard")}
          </Button>
        )}
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          {t("save")}
        </Button>
      </div>

      <dl className="grid gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
        {details.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-3 sm:block"
          >
            <dt className="text-xs text-foreground-2">
              {"label" in item ? item.label : t(item.key as "icao")}
            </dt>
            <dd
              dir={item.ltr ? "ltr" : undefined}
              className="text-sm font-medium tabular-nums text-foreground sm:mt-0.5 sm:text-start"
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </form>
  );
}
