"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { addPilot, updatePilot } from "@/lib/actions/pilots";
import { slugify } from "@/lib/slugify";
import { createPilotSchema, type PilotValues } from "@/lib/validations/pilot";
import { LabeledField, fieldA11yProps } from "@/components/form/labeled-field";
import {
  applyServerErrors,
  controlClassName,
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
import type { PilotPayload, TrackedPilot } from "@/types/tracking";

const FIELDS = [
  "id",
  "name",
  "nameAr",
  "initials",
  "licenseNumber",
  "phone",
] as const satisfies readonly (keyof PilotValues)[];

const DEFAULT_VALUES: PilotValues = {
  id: "",
  name: "",
  nameAr: "",
  initials: "",
  licenseNumber: "",
  phone: "",
};

function toValues(pilot: TrackedPilot): PilotValues {
  return {
    id: pilot.id,
    name: pilot.name,
    nameAr: pilot.nameAr ?? "",
    initials: pilot.initials,
    licenseNumber: pilot.licenseNumber ?? "",
    phone: pilot.phone ?? "",
  };
}

function toPayload(values: PilotValues): PilotPayload {
  return {
    ...values,
    initials: values.initials.toUpperCase(),
    nameAr: values.nameAr || null,
    licenseNumber: values.licenseNumber || null,
    phone: values.phone || null,
  };
}

/** The name without a title: "Capt. Aisha Khan" → ["Aisha", "Khan"]. */
function nameParts(name: string) {
  return name
    .split(/\s+/)
    .filter((part) => part && !/^(capt|captain|mr|mrs|ms|dr)\.?$/i.test(part));
}

/** "Capt. Aisha Khan" → "pilot-khan", like the existing ids. */
function suggestId(name: string) {
  const last = slugify(nameParts(name).at(-1) ?? "");
  return last ? `pilot-${last}` : "";
}

/** "Capt. Aisha Khan" → "AK" */
function suggestInitials(name: string) {
  const parts = nameParts(name);
  const picked = parts.length > 1 ? [parts[0], parts.at(-1)!] : parts;
  return picked.map((part) => part[0]).join("").toUpperCase();
}

/**
 * Add-pilot dialog, or — with `pilot` — the edit dialog (saved with PATCH;
 * the id is fixed once created).
 *
 * Pass `trigger` to open it from a button, or `open`/`onOpenChange` to
 * control it (e.g. from a menu item).
 */
export default function PilotForm({
  pilot,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  /** Edit this pilot instead of adding a new one. */
  pilot?: TrackedPilot;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("Pilots");
  const isEdit = pilot != null;
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  /** Fields typed by hand; until then they follow the name. */
  const [typed, setTyped] = useState({ id: false, initials: false });

  const {
    register,
    reset,
    setError,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PilotValues>({
    resolver: zodResolver(createPilotSchema((key) => t(`form.errors.${key}`))),
    defaultValues: pilot ? toValues(pilot) : DEFAULT_VALUES,
  });

  function setOpen(next: boolean) {
    // Each opening starts from the saved pilot, or the defaults when adding.
    if (next) {
      reset(pilot ? toValues(pilot) : DEFAULT_VALUES);
      setTyped({ id: false, initials: false });
    }
    setOpenState(next);
    onOpenChange?.(next);
  }

  /** Marks `field` as typed by hand (or not, once cleared). */
  const trackTyping = (field: keyof typeof typed) => ({
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setTyped((current) => ({ ...current, [field]: event.target.value !== "" })),
  });

  const nameField = register("name");

  async function onSubmit(values: PilotValues) {
    const { id, ...changes } = toPayload(values);
    const result = pilot
      ? await updatePilot(pilot.id, changes)
      : await addPilot({ id, ...changes });

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
              id="pilotName"
              label={t("form.name")}
              error={errors.name}
              required
            >
              <Input
                autoComplete="off"
                placeholder="Capt. Aisha Khan"
                className={controlClassName}
                {...fieldA11yProps("pilotName", errors.name)}
                {...nameField}
                onChange={(event) => {
                  nameField.onChange(event);
                  const name = event.target.value;
                  if (!isEdit && !typed.id) setValue("id", suggestId(name));
                  if (!typed.initials) {
                    setValue("initials", suggestInitials(name));
                  }
                }}
              />
            </LabeledField>

            <LabeledField
              id="pilotNameAr"
              label={t("form.nameAr")}
              error={errors.nameAr}
            >
              <Input
                autoComplete="off"
                dir="rtl"
                placeholder="الكابتن عائشة خان"
                className={controlClassName}
                {...fieldA11yProps("pilotNameAr", errors.nameAr)}
                {...register("nameAr")}
              />
            </LabeledField>

            <LabeledField
              id="pilotId"
              label={t("form.id")}
              error={errors.id}
              required
            >
              <Input
                autoComplete="off"
                dir="ltr"
                placeholder="pilot-khan"
                readOnly={isEdit}
                className={cn(controlClassName, isEdit && "opacity-60")}
                {...fieldA11yProps("pilotId", errors.id)}
                {...register("id", trackTyping("id"))}
              />
            </LabeledField>

            <LabeledField
              id="initials"
              label={t("form.initials")}
              error={errors.initials}
              required
            >
              <Input
                autoComplete="off"
                dir="ltr"
                maxLength={3}
                placeholder="AK"
                className={cn(controlClassName, "uppercase")}
                {...fieldA11yProps("initials", errors.initials)}
                {...register("initials", trackTyping("initials"))}
              />
            </LabeledField>

            <LabeledField
              id="licenseNumber"
              label={t("form.licenseNumber")}
              error={errors.licenseNumber}
            >
              <Input
                autoComplete="off"
                dir="ltr"
                placeholder="UAE-PPL-10442"
                className={controlClassName}
                {...fieldA11yProps("licenseNumber", errors.licenseNumber)}
                {...register("licenseNumber")}
              />
            </LabeledField>

            <LabeledField
              id="phone"
              label={t("form.phone")}
              error={errors.phone}
            >
              <Input
                type="tel"
                autoComplete="off"
                dir="ltr"
                placeholder="+971 50 123 4567"
                className={controlClassName}
                {...fieldA11yProps("phone", errors.phone)}
                {...register("phone")}
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
