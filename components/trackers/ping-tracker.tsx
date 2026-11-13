"use client";

import { useTranslations } from "next-intl";
import { sendTestPing } from "@/lib/actions/trackers";
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
import {
  CancelButton,
  Notice,
  TrackerLabel,
  dialogContentClassName,
  dialogFooterClassName,
} from "./feedback";
import { useLoad } from "@/hooks/use-load";

/** Sends a test ping as soon as it opens and shows the result. */
export default function PingTracker({
  tracker,
  open,
  onOpenChange,
}: {
  tracker: Tracker;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Trackers.pingDialog");
  const tCommon = useTranslations("Trackers.common");
  const { state, retry } = useLoad(open ? tracker.id : null, sendTestPing);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogContentClassName} sm:max-w-sm`}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-foreground-2">
            <TrackerLabel tracker={tracker} />
          </DialogDescription>
        </DialogHeader>

        <div aria-live="polite">
          {state.status === "loading" && (
            <Notice tone="pending">{t("sending")}</Notice>
          )}
          {state.status === "ready" && (
            <Notice tone="success">{t("sent")}</Notice>
          )}
          {state.status === "error" && (
            <Notice tone="danger">{state.message}</Notice>
          )}
        </div>

        <DialogFooter className={dialogFooterClassName}>
          <CancelButton>{tCommon("close")}</CancelButton>
          {state.status === "error" && (
            <Button type="button" onClick={retry}>
              {tCommon("retry")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
