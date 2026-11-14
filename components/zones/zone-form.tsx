"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Controller,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { addZone, updateZone } from "@/lib/actions/zones";
import { createZoneSchema, type ZoneValues } from "@/lib/validations/zone";
import {
  CEILING_REFERENCES,
  DEFAULT_VALUES,
  ZONE_KINDS,
  toPayload,
  toValues,
  zoneFieldPaths,
} from "@/lib/zones/form-values";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";
import {
  FormSelect,
  applyServerErrors,
  controlClassName,
} from "@/components/form/form-controls";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CancelButton,
  ErrorNotice,
  dialogContentClassName,
  dialogFooterClassName,
} from "@/components/trackers/feedback";
import type { TrackedZone } from "@/types/tracking";
import BoundaryFields from "./boundary-fields";

/** Select items for `values`, plus `current` when it isn't one of them. */
function withCurrent(values: readonly string[], current: string) {
  return current && !values.includes(current) ? [current, ...values] : values;
}

/**
 * Add-zone dialog, or — with `zone` — the edit dialog, filled from the row
 * and saved with PATCH.
 *
 * Pass `trigger` to open it from a button, or `open`/`onOpenChange` to
 * control it.
 */
export default function ZoneForm({
  zone,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  /** Edit this zone instead of adding a new one. */
  zone?: TrackedZone;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("Zones");
  const isEdit = zone != null;
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;

  const {
    control,
    register,
    reset,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ZoneValues>({
    resolver: zodResolver(createZoneSchema((key) => t(`form.errors.${key}`))),
    defaultValues: zone ? toValues(zone) : DEFAULT_VALUES,
  });
  const [kind, ceilingReference] = useWatch({
    control,
    name: ["kind", "ceilingReference"],
  });

  const kindItems = withCurrent(ZONE_KINDS, kind).map((value) => ({
    value,
    label: t.has(`kinds.${value}` as "kinds.atz")
      ? t(`kinds.${value}` as "kinds.atz")
      : value,
  }));
  const referenceItems = withCurrent(CEILING_REFERENCES, ceilingReference).map(
    (value) => ({ value, label: value }),
  );

  function setOpen(next: boolean) {
    // Each opening starts from the saved zone, or the defaults when adding.
    if (next) reset(zone ? toValues(zone) : DEFAULT_VALUES);
    setOpenState(next);
    onOpenChange?.(next);
  }

  async function onSubmit(values: ZoneValues) {
    const payload = toPayload(values, zone);
    const result = zone
      ? await updateZone(zone.id, payload)
      : await addZone(payload);

    if (result.ok) {
      setOpen(false);
      return;
    }

    applyServerErrors(result, zoneFieldPaths(values), setError);
  }

  /** A numeric input registered as a number (empty → NaN → "required"). */
  const numberInput = (
    name: FieldPath<ZoneValues>,
    error: { message?: string } | undefined,
    step = "any",
  ) => (
    <Input
      type="number"
      inputMode="decimal"
      step={step}
      dir="ltr"
      className={controlClassName}
      {...fieldA11yProps(name, error as never)}
      {...register(name, { valueAsNumber: true })}
    />
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}

      <DialogContent
        className={`${dialogContentClassName} max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl`}
      >
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-5"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {isEdit ? t("form.editTitle") : t("form.title")}
            </DialogTitle>
            <DialogDescription className="text-foreground-2">
              {isEdit ? t("form.editDescription") : t("form.description")}
            </DialogDescription>
          </DialogHeader>

          {errors.root?.server && (
            <ErrorNotice message={errors.root.server.message} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledField
              id="name"
              label={t("form.name")}
              error={errors.name}
              required
            >
              <Input
                autoComplete="off"
                dir="ltr"
                placeholder="North Sector"
                className={controlClassName}
                {...fieldA11yProps("name", errors.name)}
                {...register("name")}
              />
            </LabeledField>

            <LabeledField
              id="nameAr"
              label={t("form.nameAr")}
              error={errors.nameAr}
            >
              <Input
                autoComplete="off"
                dir="rtl"
                placeholder="القطاع الشمالي"
                className={controlClassName}
                {...fieldA11yProps("nameAr", errors.nameAr)}
                {...register("nameAr")}
              />
            </LabeledField>

            <FormSelect
              control={control}
              name="kind"
              label={t("form.kind")}
              items={kindItems}
            />

            <LabeledField
              id="color"
              label={t("form.color")}
              error={errors.color}
              required
            >
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <div className="flex gap-2">
                    <input
                      type="color"
                      aria-label={t("form.color")}
                      value={field.value}
                      onChange={field.onChange}
                      className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-card-2/60 p-1"
                    />
                    <Input
                      dir="ltr"
                      autoComplete="off"
                      className={controlClassName}
                      {...fieldA11yProps("color", errors.color)}
                      {...field}
                    />
                  </div>
                )}
              />
            </LabeledField>
          </div>

          <BoundaryFields
            control={control}
            register={register}
            errors={errors}
            holesCount={zone?.holes?.length}
          />

          {/* Altitude and warnings */}
          <div className="grid gap-4 sm:grid-cols-3">
            <LabeledField
              id="floorFt"
              label={t("form.floorFt")}
              error={errors.floorFt}
              required
            >
              {numberInput("floorFt", errors.floorFt, "1")}
            </LabeledField>
            <LabeledField
              id="ceilingFt"
              label={t("form.ceilingFt")}
              error={errors.ceilingFt}
              required
            >
              {numberInput("ceilingFt", errors.ceilingFt, "1")}
            </LabeledField>
            <FormSelect
              control={control}
              name="ceilingReference"
              label={t("form.ceilingReference")}
              items={referenceItems}
            />
            <LabeledField
              id="lateralWarningBufferNm"
              label={t("form.lateralWarningBufferNm")}
              error={errors.lateralWarningBufferNm}
              required
            >
              {numberInput(
                "lateralWarningBufferNm",
                errors.lateralWarningBufferNm,
              )}
            </LabeledField>
            <LabeledField
              id="altitudeWarningMarginFt"
              label={t("form.altitudeWarningMarginFt")}
              error={errors.altitudeWarningMarginFt}
              required
            >
              {numberInput(
                "altitudeWarningMarginFt",
                errors.altitudeWarningMarginFt,
                "1",
              )}
            </LabeledField>

            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <label
                  htmlFor="active"
                  className="flex cursor-pointer items-center justify-between gap-3 self-end rounded-lg border border-border bg-card-2/40 px-3 py-2"
                >
                  <span className="text-sm font-medium">
                    {t("form.active")}
                  </span>
                  <Switch
                    id="active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </label>
              )}
            />
          </div>

          <LabeledField id="notes" label={t("form.notes")} error={errors.notes}>
            <Textarea
              rows={2}
              className={cn(controlClassName, "min-h-16")}
              {...fieldA11yProps("notes", errors.notes)}
              {...register("notes")}
            />
          </LabeledField>

          <LabeledField
            id="summary"
            label={t("form.summary")}
            error={errors.summary}
            required
          >
            <Input
              autoComplete="off"
              placeholder={t(
                isEdit ? "form.summaryEditPlaceholder" : "form.summaryPlaceholder",
              )}
              className={controlClassName}
              {...fieldA11yProps("summary", errors.summary)}
              {...register("summary")}
            />
          </LabeledField>

          <DialogFooter className={dialogFooterClassName}>
            <CancelButton />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              {isEdit ? t("form.saveChanges") : t("form.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
