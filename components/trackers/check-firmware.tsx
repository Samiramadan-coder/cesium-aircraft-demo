"use client";

import { useTranslations } from "next-intl";
import { checkFirmware } from "@/lib/actions/trackers";
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
  Panel,
  TrackerLabel,
  dialogContentClassName,
  dialogFooterClassName,
} from "./feedback";
import { EMPTY } from "./shared";
import { useLoad } from "@/hooks/use-load";

/** Checks the tracker's firmware as soon as it opens and shows the result. */
export default function CheckFirmware({
  tracker,
  open,
  onOpenChange,
}: {
  tracker: Tracker;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Trackers.firmwareDialog");
  const tCommon = useTranslations("Trackers.common");
  const { state, retry } = useLoad(open ? tracker.id : null, checkFirmware);

  const current =
    state.status === "ready"
      ? (state.data.currentVersion ?? tracker.firmware)
      : tracker.firmware;

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

        <div className="space-y-2" aria-live="polite">
          <Version label={t("current")} value={current} />
          {state.status === "ready" && (
            <Version label={t("latest")} value={state.data.latestVersion} />
          )}

          {state.status === "loading" && (
            <Notice tone="pending">{t("checking")}</Notice>
          )}
          {state.status === "ready" &&
            (state.data.updateAvailable ? (
              <Notice tone="warning">
                {t("updateAvailable", {
                  version: state.data.latestVersion ?? EMPTY,
                })}
              </Notice>
            ) : (
              <Notice tone="success">{t("upToDate")}</Notice>
            ))}
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

function Version({ label, value }: { label: string; value: string | null }) {
  return (
    <Panel className="flex items-center justify-between gap-4">
      <span className="text-sm text-foreground-2">{label}</span>
      <span dir="ltr" className="font-mono font-semibold tabular-nums">
        {value ?? EMPTY}
      </span>
    </Panel>
  );
}
