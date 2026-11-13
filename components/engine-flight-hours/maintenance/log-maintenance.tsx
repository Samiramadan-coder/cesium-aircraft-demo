"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { logMaintenance } from "@/lib/actions/engine-hours";
import {
  createMaintenanceSchema,
  type MaintenanceValues,
} from "@/lib/validations/maintenance";
import {
  FormSelect,
  applyServerErrors,
  controlClassName,
  toItems,
} from "@/components/form/form-controls";
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
import { Textarea } from "@/components/ui/textarea";
import { useEngineers } from "@/components/common/engineers-provider";
import type { MaintenanceAircraftOption } from "@/types/engine-flight-hours";
import { SERVICE_TYPES } from "./service-types";

const FIELDS = ["aircraftId", "type", "engineer", "notes"] as const;

/** Local calendar day as YYYY-MM-DD. */
function today() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function LogMaintenance({
  trigger,
  aircraft,
  defaultAircraftId,
  onLogged,
}: {
  /** The element that opens the dialog, e.g. a <Button />. */
  trigger: React.ReactElement;
  aircraft: MaintenanceAircraftOption[];
  /** Preselected aircraft; the user can still pick another one. */
  defaultAircraftId?: string;
  /** Called after the record is saved. */
  onLogged?: () => void;
}) {
  const t = useTranslations("EngineHours.logMaintenanceDialog");
  const tServiceTypes = useTranslations("EngineHours.details.serviceTypes");
  const [open, setOpen] = useState(false);
  const engineers = useEngineers();

  const defaultValues: MaintenanceValues = {
    aircraftId: defaultAircraftId ?? aircraft[0]?.id ?? "",
    type: SERVICE_TYPES[0],
    engineer: engineers[0] ?? "",
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

    if (!result.ok) {
      applyServerErrors(result, FIELDS, setError);
      return;
    }

    setOpen(false);
    onLogged?.();
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

          <FormSelect
            control={control}
            name="aircraftId"
            label={t("aircraft")}
            items={aircraftItems}
          />

          <FormSelect
            control={control}
            name="type"
            label={t("serviceType")}
            items={typeItems}
          />

          <FormSelect
            control={control}
            name="engineer"
            label={t("engineer")}
            items={toItems(engineers)}
          />

          <LabeledField id="notes" label={t("notes")} error={errors.notes}>
            <Textarea
              rows={3}
              placeholder={t("notesPlaceholder")}
              className={`${controlClassName} min-h-20 resize-y`}
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
