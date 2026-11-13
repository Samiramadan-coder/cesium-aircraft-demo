"use client";

import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { linkTracker } from "@/lib/actions/trackers";
import {
  createTrackerLinkSchema,
  type TrackerLinkValues,
} from "@/lib/validations/tracker-link";
import { ENGINEERS } from "@/constants/engineers";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tracker } from "@/types/trackers";
import type { TrackedAircraft } from "@/types/tracking";

// The theme's popover/muted colors are light; match the dark cards instead.
const controlClassName =
  "w-full border-border bg-card-2/60 text-foreground hover:bg-card-2 aria-invalid:border-danger";
const selectContentClassName = "bg-card text-foreground ring-border";
const selectItemClassName =
  "focus:bg-card-2 focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground";

const FIELDS = ["aircraftId", "installedBy"] as const;

/** Links the tracker to an aircraft that doesn't have one yet. */
export default function LinkTracker({
  tracker,
  aircraft,
  open,
  onOpenChange,
}: {
  tracker: Tracker;
  /** Aircraft that can take this tracker. */
  aircraft: TrackedAircraft[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Trackers.linkDialog");

  const {
    control,
    reset,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TrackerLinkValues>({
    resolver: zodResolver(createTrackerLinkSchema((key) => t(`errors.${key}`))),
    defaultValues: { aircraftId: "", installedBy: ENGINEERS[0] },
  });

  const firstAircraftId = aircraft[0]?.id ?? "";

  // Start fresh on every open.
  useEffect(() => {
    if (open) reset({ aircraftId: firstAircraftId, installedBy: ENGINEERS[0] });
  }, [open, firstAircraftId, reset]);

  const aircraftItems = aircraft.map((item) => ({
    value: item.id,
    label: item.name
      ? `${item.registration} — ${item.name}`
      : item.registration,
  }));
  const engineerItems = ENGINEERS.map((value) => ({ value, label: value }));

  async function onSubmit(values: TrackerLinkValues) {
    const result = await linkTracker(tracker.id, values);

    if (result.ok) {
      onOpenChange(false);
      return;
    }

    let shownOnField = false;
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if ((FIELDS as readonly string[]).includes(field)) {
        setError(
          field as (typeof FIELDS)[number],
          { message },
          {
            shouldFocus: !shownOnField,
          },
        );
        shownOnField = true;
      }
    }
    if (!shownOnField) setError("root.server", { message: result.message });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-md *:data-[slot=dialog-close]:text-foreground-2">
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
              {tracker.model} ·{" "}
              <span dir="ltr" className="font-mono tabular-nums">
                {tracker.imei}
              </span>
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

          {aircraft.length === 0 ? (
            <p className="rounded-lg border border-border bg-card-2/40 px-3 py-2.5 text-sm text-foreground-2">
              {t("noAircraft")}
            </p>
          ) : (
            <>
              <SelectField
                control={control}
                name="aircraftId"
                label={t("aircraft")}
                items={aircraftItems}
              />
              <SelectField
                control={control}
                name="installedBy"
                label={t("installedBy")}
                items={engineerItems}
              />
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
              disabled={isSubmitting || aircraft.length === 0}
            >
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SelectField({
  control,
  name,
  label,
  items,
}: {
  control: Control<TrackerLinkValues>;
  name: keyof TrackerLinkValues;
  label: string;
  items: { value: string; label: string }[];
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <LabeledField id={`link-${name}`} label={label} error={error} required>
          <Select
            items={items}
            value={field.value}
            onValueChange={(value) => field.onChange(value ?? "")}
          >
            <SelectTrigger
              {...fieldA11yProps(`link-${name}`, error)}
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
