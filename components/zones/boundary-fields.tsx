"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { cn } from "cn";
import { AIRPORT } from "@/lib/zones/form-values";
import type { ZoneValues } from "@/lib/validations/zone";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";
import { FormSelect, controlClassName } from "@/components/form/form-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * The zone's shape: a list of points for a polygon, or centre and radius for
 * a circle. Used by the add/edit dialog and the map page's boundary editor.
 */
export default function BoundaryFields({
  control,
  register,
  errors,
  holesCount = 0,
  compact = false,
  idPrefix = "",
}: {
  control: Control<ZoneValues>;
  register: UseFormRegister<ZoneValues>;
  errors: FieldErrors<ZoneValues>;
  /** Exclusion areas the zone already has; they're kept as they are. */
  holesCount?: number;
  /** One column, for the narrow side panel. */
  compact?: boolean;
  /** Keeps ids unique when two forms are on the page. */
  idPrefix?: string;
}) {
  const t = useTranslations("Zones");
  const points = useFieldArray({ control, name: "points" });
  const type = useWatch({ control, name: "type" });

  const pointsError = errors.points?.root?.message ?? errors.points?.message;
  const typeItems = (["polygon", "circle"] as const).map((value) => ({
    value,
    label: t(`shapes.${value}`),
  }));

  const numberField = (
    name: "center.lat" | "center.lon" | "radiusMeters",
    label: string,
    error: FieldErrors<ZoneValues>["radiusMeters"],
    step = "any",
  ) => (
    <LabeledField
      id={`${idPrefix}${name}`}
      label={label}
      error={error}
      required
    >
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        dir="ltr"
        className={controlClassName}
        {...fieldA11yProps(`${idPrefix}${name}`, error)}
        {...register(name, { valueAsNumber: true })}
      />
    </LabeledField>
  );

  return (
    <fieldset className="grid gap-4 rounded-lg border border-border bg-card-2/40 p-3">
      <legend className="px-1 text-sm font-medium">{t("form.shape")}</legend>

      <FormSelect
        control={control}
        name="type"
        id={`${idPrefix}type`}
        label={t("form.type")}
        items={typeItems}
      />

      {type === "polygon" ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {t("form.points")}
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-border bg-card text-foreground hover:bg-card-2"
              onClick={() => {
                const last = points.fields.at(-1);
                points.append(
                  last ? { lat: last.lat, lon: last.lon } : AIRPORT,
                );
              }}
            >
              <Plus />
              {t("form.addPoint")}
            </Button>
          </div>

          {points.fields.length === 0 && (
            <p className="text-xs text-foreground-2">{t("form.noPoints")}</p>
          )}

          {points.fields.map((field, i) => {
            const error = errors.points?.[i];
            return (
              <div key={field.id} className="flex items-start gap-2">
                <span className="mt-2 w-5 shrink-0 text-end text-xs tabular-nums text-foreground-2">
                  {i + 1}
                </span>
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                  {(["lat", "lon"] as const).map((axis) => (
                    <div key={axis} className="grid min-w-0 gap-1">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        dir="ltr"
                        aria-label={t(`form.${axis}Of`, { n: i + 1 })}
                        placeholder={t(`form.${axis}`)}
                        aria-invalid={error?.[axis] ? true : undefined}
                        className={cn(controlClassName, compact && "px-2")}
                        {...register(`points.${i}.${axis}`, {
                          valueAsNumber: true,
                        })}
                      />
                      {error?.[axis] && (
                        <p className="text-xs text-danger">
                          {error[axis].message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("form.removePoint", { n: i + 1 })}
                  className="mt-1 text-foreground-2 hover:bg-card-2 hover:text-danger"
                  onClick={() => points.remove(i)}
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })}

          {pointsError && (
            <p role="alert" className="text-xs text-danger">
              {pointsError}
            </p>
          )}

          {holesCount > 0 && (
            <p className="text-xs text-foreground-2">
              {t("form.holesKept", { count: holesCount })}
            </p>
          )}
        </div>
      ) : (
        <div className={cn("grid gap-4", !compact && "sm:grid-cols-3")}>
          {numberField("center.lat", t("form.centerLat"), errors.center?.lat)}
          {numberField("center.lon", t("form.centerLon"), errors.center?.lon)}
          {numberField(
            "radiusMeters",
            t("form.radiusMeters"),
            errors.radiusMeters,
            "1",
          )}
        </div>
      )}
    </fieldset>
  );
}
