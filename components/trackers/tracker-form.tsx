"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { addTracker, getTracker, updateTracker } from "@/lib/actions/trackers";
import {
  createTrackerSchema,
  type TrackerValues,
} from "@/lib/validations/tracker";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { TrackerDetails } from "@/types/trackers";
import {
  CancelButton,
  ErrorNotice,
  dialogContentClassName,
  dialogFooterClassName,
} from "./feedback";
import {
  FormSelect,
  applyServerErrors,
  controlClassName,
  toItems,
} from "@/components/form/form-controls";
import {
  ENGINE_INPUTS,
  POWER_SOURCES,
  SIM_CARRIERS,
  TRACKER_MODELS,
} from "./options";
import { useOptionLabel } from "./shared";
import { useLoad } from "@/hooks/use-load";
import { useEngineers } from "@/components/common/engineers-provider";

const FIELDS = [
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
] as const satisfies readonly (keyof TrackerValues)[];

const DEFAULT_VALUES: TrackerValues = {
  imei: "",
  model: TRACKER_MODELS[0],
  serial: "",
  sim: SIM_CARRIERS[0].value,
  simNumber: "",
  apn: SIM_CARRIERS[0].apn,
  powerSource: POWER_SOURCES[0],
  engineInput: ENGINE_INPUTS[0],
  installedBy: "",
  registerInTraccar: true,
};

/** Form values from a saved tracker; anything missing falls back to the defaults. */
function toValues(details: TrackerDetails): TrackerValues {
  return {
    imei: details.imei ?? "",
    model: details.model || DEFAULT_VALUES.model,
    serial: details.serial ?? "",
    sim: details.sim || DEFAULT_VALUES.sim,
    simNumber: details.simNumber ?? "",
    apn: details.apn ?? "",
    powerSource: details.powerSource || DEFAULT_VALUES.powerSource,
    engineInput: details.engineInput || DEFAULT_VALUES.engineInput,
    installedBy: details.installedBy || DEFAULT_VALUES.installedBy,
    // Only applies when adding; never sent on edit.
    registerInTraccar: false,
  };
}

/** Select items for `values`, plus `current` when it isn't one of them. */
function withCurrent(values: readonly string[], current: string | undefined) {
  return toItems(
    current && !values.includes(current) ? [current, ...values] : values,
  );
}

/**
 * Add-tracker dialog, or — with `trackerId` — the edit dialog: it loads the
 * tracker, fills the same form and saves with PATCH.
 *
 * Pass `trigger` to open it from a button, or `open`/`onOpenChange` to
 * control it (e.g. from a menu item).
 */
export default function TrackerForm({
  trackerId,
  models: modelsProp,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  /** Edit this tracker instead of adding a new one. */
  trackerId?: string;
  /** Model choices, from `/v1/firmware-versions`; falls back to TRACKER_MODELS. */
  models?: string[];
  /** The element that opens the dialog, e.g. a <Button />. */
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("Trackers.addDialog");
  const powerLabel = useOptionLabel("powerSources");
  const engineLabel = useOptionLabel("engineInputs");
  const isEdit = trackerId != null;
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const models = modelsProp?.length ? modelsProp : TRACKER_MODELS;
  const engineers = useEngineers();

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
    defaultValues: { ...DEFAULT_VALUES, installedBy: engineers[0] ?? "" },
  });

  // Editing: load the saved tracker each time the dialog opens.
  const saved = useLoad(
    open && trackerId ? trackerId : null,
    getTracker,
    (data) => reset(toValues(data)),
  );
  const ready = !isEdit || saved.state.status === "ready";

  // A saved tracker may use a value that isn't in the list (e.g. an older
  // model name); keep it selectable so editing doesn't silently change it.
  const [currentModel, currentInstaller] = useWatch({
    control,
    name: ["model", "installedBy"],
  });
  const modelItems = withCurrent(models, currentModel);
  const engineerItems = withCurrent(engineers, currentInstaller);
  const simItems = toItems(SIM_CARRIERS.map((item) => item.value));
  const powerItems = POWER_SOURCES.map((value) => ({
    value,
    label: powerLabel(value),
  }));
  const engineItems = ENGINE_INPUTS.map((value) => ({
    value,
    label: engineLabel(value),
  }));

  function setOpen(next: boolean) {
    // Adding starts from the defaults every time.
    if (next && !isEdit) reset({
        ...DEFAULT_VALUES,
        model: models[0],
        installedBy: engineers[0] ?? "",
      });
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { registerInTraccar, ...changes } = values;
    const result = trackerId
      ? await updateTracker(trackerId, changes)
      : await addTracker(values);

    if (result.ok) setOpen(false);
    else applyServerErrors(result, FIELDS, setError);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}

      <DialogContent
        className={`${dialogContentClassName} max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl`}
      >
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
            <ErrorNotice message={errors.root.server.message} />
          )}

          {isEdit && saved.state.status === "loading" && <FormSkeleton />}
          {isEdit && saved.state.status === "error" && (
            <ErrorNotice message={saved.state.message} onRetry={saved.retry} />
          )}

          {ready && (
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

                <FormSelect
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

                <FormSelect
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

                <FormSelect
                  control={control}
                  name="powerSource"
                  label={t("powerSource")}
                  items={powerItems}
                />

                <FormSelect
                  control={control}
                  name="engineInput"
                  label={t("engineInput")}
                  items={engineItems}
                />

                <FormSelect
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

          <DialogFooter className={dialogFooterClassName}>
            <CancelButton />
            <Button type="submit" disabled={isSubmitting || !ready}>
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              {isEdit ? t("saveChanges") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 9 }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-15 bg-card-2", i === 8 && "sm:col-span-2")}
        />
      ))}
    </div>
  );
}
