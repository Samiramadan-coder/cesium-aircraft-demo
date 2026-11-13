"use client";

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { unlinkTracker } from "@/lib/actions/trackers";
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
import type { Tracker } from "@/types/trackers";
import type { TrackedAircraft } from "@/types/tracking";

/** Confirms, then unlinks the tracker from its aircraft. */
export default function UnlinkTracker({
  tracker,
  aircraft,
  open,
  onOpenChange,
}: {
  tracker: Tracker;
  aircraft: TrackedAircraft;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Trackers.unlinkDialog");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    // Don't close mid-request.
    if (pending) return;
    if (next) setError(null);
    onOpenChange(next);
  }

  function handleUnlink() {
    startTransition(async () => {
      const result = await unlinkTracker(tracker.id);
      if (result.ok) {
        onOpenChange(false);
        return;
      }
      setError(result.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-md *:data-[slot=dialog-close]:text-foreground-2">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{t("title")}</DialogTitle>
          <DialogDescription className="text-foreground-2">
            {t.rich("description", {
              device: tracker.model,
              imei: tracker.imei,
              aircraft: aircraft.name
                ? `${aircraft.registration} — ${aircraft.name}`
                : aircraft.registration,
              strong: (chunks) => (
                <strong className="font-medium text-foreground">{chunks}</strong>
              ),
              mono: (chunks) => (
                <span dir="ltr" className="font-mono tabular-nums">
                  {chunks}
                </span>
              ),
            })}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <DialogFooter className="border-border bg-card-2/40">
          <DialogClose
            disabled={pending}
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
            type="button"
            disabled={pending}
            onClick={handleUnlink}
            className="bg-danger text-background hover:bg-danger/90"
          >
            {pending && <LoaderCircle className="animate-spin" />}
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
