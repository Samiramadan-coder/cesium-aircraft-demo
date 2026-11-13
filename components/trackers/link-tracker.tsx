"use client";

import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ENGINEERS } from "@/constants/engineers";
import { linkTracker } from "@/lib/actions/trackers";
import {
  createTrackerLinkSchema,
  type TrackerLinkValues,
} from "@/lib/validations/tracker-link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Tracker } from "@/types/trackers";
import type { TrackedAircraft } from "@/types/tracking";
import {
  CancelButton,
  ErrorNotice,
  Panel,
  TrackerLabel,
  dialogContentClassName,
  dialogFooterClassName,
} from "./feedback";
import { FormSelect, applyServerErrors, toItems } from "@/components/form/form-controls";
import { aircraftLabel } from "./shared";

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
    label: aircraftLabel(item),
  }));

  async function onSubmit(values: TrackerLinkValues) {
    const result = await linkTracker(tracker.id, values);
    if (result.ok) onOpenChange(false);
    else applyServerErrors(result, FIELDS, setError);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogContentClassName} sm:max-w-md`}>
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
              <TrackerLabel tracker={tracker} />
            </DialogDescription>
          </DialogHeader>

          {errors.root?.server && (
            <ErrorNotice message={errors.root.server.message} />
          )}

          {aircraft.length === 0 ? (
            <Panel className="py-2.5 text-sm text-foreground-2">
              {t("noAircraft")}
            </Panel>
          ) : (
            <>
              <FormSelect
                control={control}
                name="aircraftId"
                id="link-aircraftId"
                label={t("aircraft")}
                items={aircraftItems}
              />
              <FormSelect
                control={control}
                name="installedBy"
                id="link-installedBy"
                label={t("installedBy")}
                items={toItems(ENGINEERS)}
              />
            </>
          )}

          <DialogFooter className={dialogFooterClassName}>
            <CancelButton />
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
