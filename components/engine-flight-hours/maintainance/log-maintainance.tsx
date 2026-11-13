"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { logMaintenance } from "@/lib/actions/engine-hours";
import {
  createMaintenanceSchema,
  type MaintenanceValues,
} from "@/lib/validations/maintenance";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import type { MaintenanceAircraftOption } from "@/types/engine-flight-hours";
import { SERVICE_TYPES } from "./options";
import { ENGINEERS } from "@/constants/engineers";

// The theme's popover/muted colors are light; match the dark cards instead.
const controlClassName =
  "w-full border-border bg-card-2/60 text-foreground hover:bg-card-2 aria-invalid:border-danger";
const selectContentClassName = "bg-card text-foreground ring-border";
const selectItemClassName =
  "focus:bg-card-2 focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground";

const FIELDS = ["aircraftId", "type", "engineer", "notes"] as const;

/** Local calendar day as YYYY-MM-DD. */
function today() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function LogMaintainance({
  trigger,
  aircraft,
  defaultAircraftId,
  onLogged,
}: {
  /** The element that opens the dialog, e.g. a <Button />. */
  trigger: React.ReactElement;
  aircraft: MaintenanceAircraftOption[];
  /** Preselects (and locks nothing — the user can still change it). */
  defaultAircraftId?: string;
  /** Called after the record is saved. */
  onLogged?: () => void;
}) {
  const t = useTranslations("EngineHours.logMaintenanceDialog");
  const tServiceTypes = useTranslations("EngineHours.details.serviceTypes");
  const [open, setOpen] = useState(false);

  const defaultValues: MaintenanceValues = {
    aircraftId: defaultAircraftId ?? aircraft[0]?.id ?? "",
    type: SERVICE_TYPES[0],
    engineer: ENGINEERS[0],
    notes: "",
  };

  const {
    control,
    register,
    reset,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceValues>({
    resolver: zodResolver(createMaintenanceSchema((key) => t(`errors.${key}`))),
    defaultValues,
  });

  const aircraftItems = aircraft.map((item) => ({
    value: item.id,
    label: item.name ? `${item.registration} — ${item.name}` : item.registration,
  }));
  const selectedId = useWatch({ control, name: "aircraftId" });
  const selectedItem = aircraftItems.find((item) => item.value === selectedId);
  const typeItems = SERVICE_TYPES.map((value) => ({
    value,
    label: tServiceTypes(value),
  }));
  const engineerItems = ENGINEERS.map((value) => ({ value, label: value }));

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Start fresh each time, with the current default aircraft.
    if (next) reset(defaultValues);
  }

  async function onSubmit(values: MaintenanceValues) {
    const plane = aircraft.find((item) => item.id === values.aircraftId);
    if (!plane) return;

    const result = await logMaintenance({
      aircraftId: values.aircraftId,
      type: values.type,
      hoursAtService: plane.lifetimeHours,
      completedDate: today(),
      engineer: values.engineer,
      notes: values.notes || null,
    });

    if (result.ok) {
      setOpen(false);
      onLogged?.();
      return;
    }

    let shownOnField = false;
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if ((FIELDS as readonly string[]).includes(field)) {
        setError(field as (typeof FIELDS)[number], { message }, {
          shouldFocus: !shownOnField,
        });
        shownOnField = true;
      }
    }
    if (!shownOnField) setError("root.server", { message: result.message });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />

      <DialogContent className="border-border bg-card text-foreground sm:max-w-md *:data-[slot=dialog-close]:text-foreground-2">
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{t("title")}</DialogTitle>
            <DialogDescription className="text-foreground-2">
              {selectedItem
                ? t("description", { aircraft: selectedItem.label })
                : t("descriptionGeneric")}
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

          <SelectField
            control={control}
            name="aircraftId"
            label={t("aircraft")}
            items={aircraftItems}
          />

          <SelectField
            control={control}
            name="type"
            label={t("serviceType")}
            items={typeItems}
          />

          <SelectField
            control={control}
            name="engineer"
            label={t("engineer")}
            items={engineerItems}
          />

          <LabeledField id="notes" label={t("notes")} error={errors.notes}>
            <Textarea
              rows={3}
              placeholder={t("notesPlaceholder")}
              className={`${controlClassName} min-h-20 resize-y placeholder:text-muted/70`}
              {...fieldA11yProps("notes", errors.notes)}
              {...register("notes")}
            />
          </LabeledField>

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
              {t("back")}
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

type SelectFieldName = Exclude<keyof MaintenanceValues, "notes">;

function SelectField({
  control,
  name,
  label,
  items,
}: {
  control: Control<MaintenanceValues>;
  name: SelectFieldName;
  label: string;
  items: { value: string; label: string }[];
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <LabeledField id={name} label={label} error={error}>
          <Select
            items={items}
            value={field.value}
            onValueChange={(value) => field.onChange(value ?? "")}
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
