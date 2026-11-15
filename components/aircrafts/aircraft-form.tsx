"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import {
  addAircraft,
  updateAircraft,
  uploadAircraftPhoto,
} from "@/lib/actions/aircraft";
import {
  createAircraftSchema,
  type AircraftValues,
} from "@/lib/validations/aircraft";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";
import {
  FormSelect,
  applyServerErrors,
  controlClassName,
  toItems,
} from "@/components/form/form-controls";
import {
  CancelButton,
  ErrorNotice,
  dialogContentClassName,
  dialogFooterClassName,
} from "@/components/trackers/feedback";
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
import type {
  AircraftPayload,
  TrackedAircraft,
  TrackedPilot,
} from "@/types/tracking";
import { slugify } from "@/lib/slugify";
import PhotoField from "./photo-field";

/** Types seen from the API; a saved aircraft's own type is added if missing. */
export const AIRCRAFT_TYPES = [
  "Light Sport Aircraft",
  "Gyrocopter",
  "Paramotor",
] as const;

/** Select value for "no pilot"; sent as `null`. */
const NO_PILOT = "none";

const FIELDS = [
  "id",
  "registration",
  "name",
  "nameAr",
  "type",
  "color",
  "pilotId",
  "serviceIntervalHours",
  "photo",
] as const satisfies readonly (keyof AircraftValues)[];

const DEFAULT_VALUES: AircraftValues = {
  id: "",
  registration: "",
  name: "",
  nameAr: "",
  type: AIRCRAFT_TYPES[0],
  color: "#4A9EDB",
  pilotId: NO_PILOT,
  serviceIntervalHours: 50,
  photo: null,
};

function toValues(aircraft: TrackedAircraft): AircraftValues {
  return {
    id: aircraft.id,
    registration: aircraft.registration,
    name: aircraft.name,
    nameAr: aircraft.nameAr ?? "",
    type: aircraft.type || DEFAULT_VALUES.type,
    color: aircraft.color || DEFAULT_VALUES.color,
    pilotId: aircraft.pilotId ?? NO_PILOT,
    serviceIntervalHours:
      aircraft.serviceIntervalHours || DEFAULT_VALUES.serviceIntervalHours,
    photo: null,
  };
}

/** The JSON details; the photo is uploaded separately. */
function toPayload(values: AircraftValues): AircraftPayload {
  return {
    id: values.id,
    registration: values.registration,
    name: values.name,
    type: values.type,
    color: values.color,
    serviceIntervalHours: values.serviceIntervalHours,
    nameAr: values.nameAr || null,
    pilotId: values.pilotId === NO_PILOT ? null : values.pilotId,
  };
}

/**
 * Add-aircraft dialog, or — with `aircraft` — the edit dialog (saved with
 * PATCH; the id is fixed once created).
 *
 * Pass `trigger` to open it from a button, or `open`/`onOpenChange` to
 * control it (e.g. from a menu item).
 */
export default function AircraftForm({
  aircraft,
  pilots,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  /** Edit this aircraft instead of adding a new one. */
  aircraft?: TrackedAircraft;
  pilots: TrackedPilot[];
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("Aircrafts");
  const locale = useLocale();
  const isEdit = aircraft != null;
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  /** Whether the ID was typed by hand; until then it follows the name. */
  const [idTyped, setIdTyped] = useState(false);
  /**
   * Set once "Add" created the aircraft but its photo upload failed: the next
   * submit updates that aircraft instead of creating it again.
   */
  const [createdId, setCreatedId] = useState<string | null>(null);

  const {
    control,
    register,
    reset,
    setError,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AircraftValues>({
    resolver: zodResolver(
      createAircraftSchema((key) => t(`form.errors.${key}`)),
    ),
    defaultValues: aircraft ? toValues(aircraft) : DEFAULT_VALUES,
  });

  const [currentType, currentColor] = useWatch({
    control,
    name: ["type", "color"],
  });
  const typeItems = toItems(
    currentType && !(AIRCRAFT_TYPES as readonly string[]).includes(currentType)
      ? [currentType, ...AIRCRAFT_TYPES]
      : AIRCRAFT_TYPES,
  );
  const pilotItems = [
    { value: NO_PILOT, label: t("noPilot") },
    ...pilots
      .filter((pilot) => pilot.active || pilot.id === aircraft?.pilotId)
      .map((pilot) => ({
        value: pilot.id,
        label: (locale === "ar" && pilot.nameAr) || pilot.name,
      })),
  ];

  function setOpen(next: boolean) {
    // Each opening starts from the saved aircraft, or the defaults when adding.
    if (next) {
      reset(aircraft ? toValues(aircraft) : DEFAULT_VALUES);
      setIdTyped(false);
      setCreatedId(null);
    }
    setOpenState(next);
    onOpenChange?.(next);
  }

  const nameField = register("name");

  async function onSubmit(values: AircraftValues) {
    const { id, ...changes } = toPayload(values);
    const savedId = aircraft?.id ?? createdId;
    const saved = savedId
      ? await updateAircraft(savedId, changes)
      : await addAircraft({ id, ...changes });

    if (!saved.ok) {
      applyServerErrors(saved, FIELDS, setError);
      return;
    }

    // The photo has its own endpoint, so it goes up once the aircraft exists.
    if (values.photo) {
      const formData = new FormData();
      formData.append("photo", values.photo);
      const uploaded = await uploadAircraftPhoto(savedId ?? id, formData);

      if (!uploaded.ok) {
        if (!savedId) setCreatedId(id);
        const message = uploaded.fieldErrors?.photo ?? uploaded.message;
        setError("photo", { message: t("form.photoFailed", { message }) });
        return;
      }
    }

    setOpen(false);
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
            <Controller
              control={control}
              name="photo"
              render={({ field, fieldState: { error } }) => (
                <PhotoField
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  currentUrl={aircraft?.photoUrl ?? null}
                  color={currentColor}
                  error={error}
                  className="sm:col-span-2"
                />
              )}
            />

            <LabeledField
              id="name"
              label={t("form.name")}
              error={errors.name}
              required
            >
              <Input
                autoComplete="off"
                placeholder="Falcon Three"
                className={controlClassName}
                {...fieldA11yProps("name", errors.name)}
                {...nameField}
                onChange={(event) => {
                  nameField.onChange(event);
                  // Suggest the id from the name until it's typed by hand.
                  if (!isEdit && !idTyped) {
                    setValue("id", slugify(event.target.value));
                  }
                }}
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
                placeholder="فالكون ثلاثة"
                className={controlClassName}
                {...fieldA11yProps("nameAr", errors.nameAr)}
                {...register("nameAr")}
              />
            </LabeledField>

            <LabeledField
              id="aircraftId"
              label={t("form.id")}
              error={errors.id}
              required
            >
              <Input
                autoComplete="off"
                dir="ltr"
                placeholder="falcon-three"
                readOnly={isEdit || createdId != null}
                className={cn(controlClassName, isEdit && "opacity-60")}
                {...fieldA11yProps("aircraftId", errors.id)}
                {...register("id", {
                  onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                    setIdTyped(event.target.value !== "");
                  },
                })}
              />
            </LabeledField>

            <LabeledField
              id="registration"
              label={t("form.registration")}
              error={errors.registration}
              required
            >
              <Input
                autoComplete="off"
                dir="ltr"
                placeholder="A6-EFF"
                className={controlClassName}
                {...fieldA11yProps("registration", errors.registration)}
                {...register("registration", {
                  setValueAs: (value: string) => value.toUpperCase(),
                })}
              />
            </LabeledField>

            <FormSelect
              control={control}
              name="type"
              label={t("form.type")}
              items={typeItems}
            />

            <FormSelect
              control={control}
              name="pilotId"
              label={t("form.pilot")}
              items={pilotItems}
            />

            <LabeledField
              id="serviceIntervalHours"
              label={t("form.serviceInterval")}
              error={errors.serviceIntervalHours}
              required
            >
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                dir="ltr"
                className={controlClassName}
                {...fieldA11yProps(
                  "serviceIntervalHours",
                  errors.serviceIntervalHours,
                )}
                {...register("serviceIntervalHours", { valueAsNumber: true })}
              />
            </LabeledField>

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
