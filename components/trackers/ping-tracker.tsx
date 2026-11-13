"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { sendTestPing } from "@/lib/actions/trackers";
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

type PingState =
  | { status: "sending" }
  | { status: "sent" }
  | { status: "error"; message: string };

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
  const [state, setState] = useState<PingState>({ status: "sending" });

  const ping = useCallback(async (id: string) => {
    setState({ status: "sending" });
    const result = await sendTestPing(id);
    setState(
      result.ok
        ? { status: "sent" }
        : { status: "error", message: result.message },
    );
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- send on open
    if (open) ping(tracker.id);
  }, [open, tracker.id, ping]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-sm *:data-[slot=dialog-close]:text-foreground-2">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{t("title")}</DialogTitle>
          <DialogDescription className="text-foreground-2">
            {tracker.model} ·{" "}
            <span dir="ltr" className="font-mono tabular-nums">
              {tracker.imei}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div aria-live="polite">
          {state.status === "sending" && (
            <p className="flex items-center gap-2.5 rounded-lg border border-border bg-card-2/40 px-3 py-2.5 text-sm text-foreground-2">
              <LoaderCircle className="size-4 shrink-0 animate-spin" />
              {t("sending")}
            </p>
          )}
          {state.status === "sent" && (
            <p className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
              <CircleCheck className="size-4 shrink-0" />
              {t("sent")}
            </p>
          )}
          {state.status === "error" && (
            <p
              role="alert"
              className="flex items-center gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger"
            >
              <CircleX className="size-4 shrink-0" />
              {state.message}
            </p>
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
            <Button type="button" onClick={() => ping(tracker.id)}>
              {t("retry")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
