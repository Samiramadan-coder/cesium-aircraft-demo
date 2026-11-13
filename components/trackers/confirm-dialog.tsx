"use client";

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/api/errors";
import {
  CancelButton,
  ErrorNotice,
  dialogContentClassName,
  dialogFooterClassName,
} from "./feedback";

/**
 * "Are you sure?" for a destructive action (delete, unlink): runs `onConfirm`,
 * closes on success, shows the error otherwise. Can't be closed mid-request.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<ActionResult<unknown>>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (pending) return;
    if (next) setError(null);
    onOpenChange(next);
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result.ok) onOpenChange(false);
      else setError(result.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`${dialogContentClassName} sm:max-w-md`}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-foreground-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        {error && <ErrorNotice message={error} />}

        <DialogFooter className={dialogFooterClassName}>
          <CancelButton disabled={pending} />
          <Button
            type="button"
            disabled={pending}
            onClick={handleConfirm}
            className="bg-danger text-background hover:bg-danger/90"
          >
            {pending && <LoaderCircle className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
