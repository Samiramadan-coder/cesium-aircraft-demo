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

import { useCallback, useEffect, useState } from "react";
import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrackerDetails } from "@/types/trackers";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ENGINEERS } from "@/constants/engineers";
import { addTracker, getTracker, updateTracker } from "@/lib/actions/trackers";
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

/** Form values from a saved tracker; anything missing falls back to the defaults. */
function toValues(details: TrackerDetails): TrackerValues {
  return {
    ...DEFAULT_VALUES,
    imei: details.imei ?? "",
    model: details.model || DEFAULT_VALUES.model,
    serial: details.serial ?? "",
    sim: details.sim || DEFAULT_VALUES.sim,
    simNumber: details.simNumber ?? "",
    apn: details.apn ?? "",
    powerSource: details.powerSource || DEFAULT_VALUES.powerSource,
    engineInput: details.engineInput || DEFAULT_VALUES.engineInput,
    installedBy: details.installedBy || DEFAULT_VALUES.installedBy,
    registerInTraccar: false,
  };
}

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string };

/**
 * Add-tracker dialog, or — with `trackerId` — the edit dialog: it loads the
 * tracker, fills the same form and saves with PATCH.
 *
 * Pass `trigger` to open it from a button, or `open`/`onOpenChange` to
 * control it (e.g. from a menu item).
 */
export default function TrackerForm({
  trackerId,
  trigger,
  open: openProp,
  onOpenChange,
  onSaved,
}: {
  /** Edit this tracker instead of adding a new one. */
  trackerId?: string;
  /** The element that opens the dialog, e.g. a <Button />. */
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called after the tracker is saved. */
  onSaved?: () => void;
}) {
  const t = useTranslations("Trackers.addDialog");
  const isEdit = trackerId != null;
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const [load, setLoad] = useState<LoadState>({ status: "idle" });

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

  const loadTracker = useCallback(
    async (id: string) => {
      setLoad({ status: "loading" });
      const result = await getTracker(id);
      if (result.ok) {
        reset(toValues(result.data));
        setLoad({ status: "idle" });
      } else {
        setLoad({ status: "error", message: result.message });
      }
    },
    [reset],
  );

  // Start fresh on every open: defaults when adding, the saved tracker when editing.
  useEffect(() => {
    if (!open) return;
    if (trackerId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on open
      loadTracker(trackerId);
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [open, trackerId, loadTracker, reset]);

  function setOpen(next: boolean) {
    setOpenState(next);
    onOpenChange?.(next);
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
    const result = trackerId
      ? // Registering in Traccar only applies when adding.
        await updateTracker(trackerId, omitRegister(values))
      : await addTracker(values);

    if (result.ok) {
      setOpen(false);
      onSaved?.();
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
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}

      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-border bg-card text-foreground sm:max-w-xl *:data-[slot=dialog-close]:text-foreground-2">
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {isEdit ? t("editTitle") : t("title")}
            </DialogTitle>
            <DialogDescription className="text-foreground-2">
              {isEdit ? t("editDescription") : t("description")}
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

          {load.status === "loading" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 9 }, (_, i) => (
                <Skeleton
                  key={i}
                  className={cn("h-15 bg-card-2", i === 8 && "sm:col-span-2")}
                />
              ))}
            </div>
          )}

          {load.status === "error" && (
            <div className="space-y-3 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
              <p>{load.message}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-border bg-card text-foreground hover:bg-card-2"
                onClick={() => trackerId && loadTracker(trackerId)}
              >
                {t("retry")}
              </Button>
            </div>
          )}

          {load.status === "idle" && (
            <>
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

                <LabeledField
                  id="apn"
                  label={t("apn")}
                  error={errors.apn}
                  required
                >
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

              {!isEdit && (
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
              )}
            </>
          )}

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
            <Button
              type="submit"
              disabled={isSubmitting || load.status !== "idle"}
            >
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              {isEdit ? t("saveChanges") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function omitRegister(values: TrackerValues) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { registerInTraccar, ...rest } = values;
  return rest;
}

type SelectFieldName =
  "model" | "sim" | "powerSource" | "engineInput" | "installedBy";

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
