"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { checkFirmware } from "@/lib/actions/trackers";
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
import type { FirmwareCheck, Tracker } from "@/types/trackers";

type CheckState =
  | { status: "checking" }
  | { status: "done"; data: FirmwareCheck }
  | { status: "error"; message: string };

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
  const [state, setState] = useState<CheckState>({ status: "checking" });

  const check = useCallback(async (id: string) => {
    setState({ status: "checking" });
    const result = await checkFirmware(id);
    setState(
      result.ok
        ? { status: "done", data: result.data }
        : { status: "error", message: result.message },
    );
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- check on open
    if (open) check(tracker.id);
  }, [open, tracker.id, check]);

  const current =
    state.status === "done"
      ? (state.data.currentVersion ?? tracker.firmware)
      : tracker.firmware;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-sm *:data-[slot=dialog-close]:text-foreground-2">
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

        <div className="space-y-2" aria-live="polite">
          <Version label={t("current")} value={current} />
          {state.status === "done" && (
            <Version label={t("latest")} value={state.data.latestVersion} />
          )}

          {state.status === "checking" && (
            <Notice className="border-border bg-card-2/40 text-foreground-2">
              <LoaderCircle className="size-4 shrink-0 animate-spin" />
              {t("checking")}
            </Notice>
          )}
          {state.status === "done" &&
            (state.data.updateAvailable ? (
              <Notice className="border-primary/40 bg-primary/10 text-primary">
                <CircleAlert className="size-4 shrink-0" />
                {t("updateAvailable", {
                  version: state.data.latestVersion ?? "—",
                })}
              </Notice>
            ) : (
              <Notice className="border-success/30 bg-success/10 text-success">
                <CircleCheck className="size-4 shrink-0" />
                {t("upToDate")}
              </Notice>
            ))}
          {state.status === "error" && (
            <Notice
              role="alert"
              className="border-danger/30 bg-danger/10 text-danger"
            >
              <CircleX className="size-4 shrink-0" />
              {state.message}
            </Notice>
          )}
        </div>

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
            {t("close")}
          </DialogClose>
          {state.status === "error" && (
            <Button type="button" onClick={() => check(tracker.id)}>
              {t("retry")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Version({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card-2/40 p-3">
      <span className="text-sm text-foreground-2">{label}</span>
      <span dir="ltr" className="font-mono font-semibold tabular-nums">
        {value ?? "—"}
      </span>
    </div>
  );
}

function Notice({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${className ?? ""}`}
      {...props}
    />
  );
}
