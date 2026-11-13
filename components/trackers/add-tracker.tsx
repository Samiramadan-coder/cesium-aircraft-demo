"use client";

import {
  createTrackerSchema,
  type TrackerValues,
} from "@/lib/validations/tracker";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ENGINE_INPUTS,
  POWER_SOURCES,
  SIM_CARRIERS,
  TRACKER_MODELS,
} from "./options";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ENGINEERS } from "@/constants/engineers";
import { addTracker } from "@/lib/actions/trackers";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type Control } from "react-hook-form";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";

// The theme's popover/muted colors are light; match the dark cards instead.
const controlClassName =
  "w-full border-border bg-card-2/60 text-foreground placeholder:text-muted/70 hover:bg-card-2 aria-invalid:border-danger";
const selectContentClassName = "bg-card text-foreground ring-border";
const selectItemClassName =
  "focus:bg-card-2 focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground";

type FieldName = keyof TrackerValues;

const FIELDS: readonly FieldName[] = [
  "imei",
  "model",
  "serial",
  "sim",
  "simNumber",
  "apn",
  "powerSource",
  "engineInput",
  "installedBy",
  "registerInTraccar",
];

const DEFAULT_VALUES: TrackerValues = {
  imei: "",
  model: TRACKER_MODELS[0],
  serial: "",
  sim: SIM_CARRIERS[0].value,
  simNumber: "",
  apn: SIM_CARRIERS[0].apn,
  powerSource: POWER_SOURCES[0],
  engineInput: ENGINE_INPUTS[0],
  installedBy: ENGINEERS[0],
  registerInTraccar: true,
};

export default function AddTracker({
  trigger,
  onAdded,
}: {
  /** The element that opens the dialog, e.g. a <Button />. */
  trigger: React.ReactElement;
  /** Called after the tracker is saved. */
  onAdded?: () => void;
}) {
  const t = useTranslations("Trackers.addDialog");
  const [open, setOpen] = useState(false);

  const {
    control,
    register,
    reset,
    setError,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TrackerValues>({
    resolver: zodResolver(createTrackerSchema((key) => t(`errors.${key}`))),
    defaultValues: DEFAULT_VALUES,
  });

  const modelItems = TRACKER_MODELS.map((value) => ({ value, label: value }));
  const simItems = SIM_CARRIERS.map(({ value }) => ({ value, label: value }));
  const powerItems = POWER_SOURCES.map((value) => ({
    value,
    label: t(`powerSources.${value}`),
  }));
  const engineerItems = ENGINEERS.map((value) => ({ value, label: value }));
  const engineItems = ENGINE_INPUTS.map((value) => ({
    value,
    label: t(`engineInputs.${value}`),
  }));

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) reset(DEFAULT_VALUES);
  }

  /** Swaps in the new operator's APN unless the user typed a custom one. */
  function handleSimChange(previous: string, next: string) {
    const oldApn = SIM_CARRIERS.find((item) => item.value === previous)?.apn;
    const newApn = SIM_CARRIERS.find((item) => item.value === next)?.apn;
    const apn = getValues("apn");
    if (newApn && (!apn || apn === oldApn)) {
      setValue("apn", newApn, { shouldValidate: true });
    }
  }

  async function onSubmit(values: TrackerValues) {
    const result = await addTracker(values);

    if (result.ok) {
      setOpen(false);
      onAdded?.();
      return;
    }

    let shownOnField = false;
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if ((FIELDS as readonly string[]).includes(field)) {
        setError(
          field as FieldName,
          { message },
          { shouldFocus: !shownOnField },
        );
        shownOnField = true;
      }
    }
    if (!shownOnField) setError("root.server", { message: result.message });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />

      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-border bg-card text-foreground sm:max-w-xl *:data-[slot=dialog-close]:text-foreground-2">
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {t("title")}
            </DialogTitle>
            <DialogDescription className="text-foreground-2">
              {t("description")}
            </DialogDescription>
          </DialogHeader>

          {errors.root?.server && (
            <p
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger"
            >
              {errors.root.server.message}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledField
              id="imei"
              label={t("imei")}
              error={errors.imei}
              required
            >
              <Input
                inputMode="numeric"
                autoComplete="off"
                maxLength={15}
                dir="ltr"
                placeholder="352098001761481"
                className={controlClassName}
                {...fieldA11yProps("imei", errors.imei)}
                {...register("imei")}
              />
            </LabeledField>

            <SelectField
              control={control}
              name="model"
              label={t("model")}
              items={modelItems}
            />

            <LabeledField
              id="serial"
              label={t("serial")}
              error={errors.serial}
              required
            >
              <Input
                autoComplete="off"
                dir="ltr"
                placeholder="SN-10999"
                className={controlClassName}
                {...fieldA11yProps("serial", errors.serial)}
                {...register("serial")}
              />
            </LabeledField>

            <SelectField
              control={control}
              name="sim"
              label={t("sim")}
              items={simItems}
              onChange={handleSimChange}
            />

            <LabeledField
              id="simNumber"
              label={t("simNumber")}
              error={errors.simNumber}
              required
            >
              <Input
                type="tel"
                autoComplete="off"
                dir="ltr"
                placeholder="+971 55 441 2290"
                className={controlClassName}
                {...fieldA11yProps("simNumber", errors.simNumber)}
                {...register("simNumber")}
              />
            </LabeledField>

            <LabeledField id="apn" label={t("apn")} error={errors.apn} required>
              <Input
                autoComplete="off"
                dir="ltr"
                className={controlClassName}
                {...fieldA11yProps("apn", errors.apn)}
                {...register("apn")}
              />
            </LabeledField>

            <SelectField
              control={control}
              name="powerSource"
              label={t("powerSource")}
              items={powerItems}
            />

            <SelectField
              control={control}
              name="engineInput"
              label={t("engineInput")}
              items={engineItems}
            />

            <SelectField
              control={control}
              name="installedBy"
              label={t("installedBy")}
              items={engineerItems}
              className="sm:col-span-2"
            />
          </div>

          <label
            htmlFor="registerInTraccar"
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card-2/40 px-3 py-2.5"
          >
            <input
              id="registerInTraccar"
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-primary"
              {...register("registerInTraccar")}
            />
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">
                {t("registerInTraccar")}
              </span>
              <span className="text-xs text-foreground-2">
                {t("registerInTraccarHint")}
              </span>
            </span>
          </label>

          <DialogFooter className="border-border bg-card-2/40">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="border-border bg-card text-foreground hover:bg-card-2"
                />
              }
            >
              {t("cancel")}
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type SelectFieldName =
  | "model"
  | "sim"
  | "powerSource"
  | "engineInput"
  | "installedBy";

function SelectField({
  control,
  name,
  label,
  items,
  onChange,
  className,
}: {
  control: Control<TrackerValues>;
  className?: string;
  name: SelectFieldName;
  label: string;
  items: { value: string; label: string }[];
  /** Runs after the value changes, with the previous and new values. */
  onChange?: (previous: string, next: string) => void;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <LabeledField
          id={name}
          label={label}
          error={error}
          required
          className={className}
        >
          <Select
            items={items}
            value={field.value}
            onValueChange={(value) => {
              const next = value ?? "";
              const previous = field.value;
              field.onChange(next);
              onChange?.(previous, next);
            }}
          >
            <SelectTrigger
              {...fieldA11yProps(name, error)}
              ref={field.ref}
              onBlur={field.onBlur}
              className={controlClassName}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={selectContentClassName}>
              {items.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className={selectItemClassName}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </LabeledField>
      )}
    />
  );
}
