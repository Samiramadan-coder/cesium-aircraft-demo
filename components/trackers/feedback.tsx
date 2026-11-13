"use client";

import { CircleAlert, CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import type { Tracker } from "@/types/trackers";

/** A bordered row/box on the dark card. */
export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card-2/40 p-3",
        className,
      )}
      {...props}
    />
  );
}

const NOTICE_TONES = {
  pending: {
    className: "border-border bg-card-2/40 text-foreground-2",
    Icon: LoaderCircle,
  },
  success: {
    className: "border-success/30 bg-success/10 text-success",
    Icon: CircleCheck,
  },
  warning: {
    className: "border-primary/40 bg-primary/10 text-primary",
    Icon: CircleAlert,
  },
  danger: {
    className: "border-danger/30 bg-danger/10 text-danger",
    Icon: CircleX,
  },
} as const;

/** A one-line status message with an icon. */
export function Notice({
  tone,
  children,
}: {
  tone: keyof typeof NOTICE_TONES;
  children: React.ReactNode;
}) {
  const { className, Icon } = NOTICE_TONES[tone];
  return (
    <p
      role={tone === "danger" ? "alert" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
        className,
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", tone === "pending" && "animate-spin")}
      />
      {children}
    </p>
  );
}

/** An error message, with a "Try again" button when `onRetry` is given. */
export function ErrorNotice({
  message,
  onRetry,
}: {
  message: React.ReactNode;
  onRetry?: () => void;
}) {
  const t = useTranslations("Trackers.common");

  if (!onRetry) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger"
      >
        {message}
      </p>
    );
  }

  return (
    <div
      role="alert"
      className="space-y-3 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
    >
      <p>{message}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-border bg-card text-foreground hover:bg-card-2"
        onClick={onRetry}
      >
        {t("retry")}
      </Button>
    </div>
  );
}

/** The outline "Cancel"/"Close" button that closes the surrounding dialog. */
export function CancelButton({
  children,
  disabled,
}: {
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  const t = useTranslations("Trackers.common");
  return (
    <DialogClose
      disabled={disabled}
      render={
        <Button
          type="button"
          variant="outline"
          className="border-border bg-card text-foreground hover:bg-card-2"
        />
      }
    >
      {children ?? t("cancel")}
    </DialogClose>
  );
}

/** "Teltonika FMC650 · 351899551894000" — names the device in dialog headers. */
export function TrackerLabel({
  tracker,
}: {
  tracker: Pick<Tracker, "model" | "imei">;
}) {
  return (
    <>
      {tracker.model} ·{" "}
      <span dir="ltr" className="font-mono tabular-nums">
        {tracker.imei}
      </span>
    </>
  );
}

/** `<strong>` and `<mono>` tags for `t.rich` messages. */
export const richTags = {
  strong: (chunks: React.ReactNode) => (
    <strong className="font-medium text-foreground">{chunks}</strong>
  ),
  mono: (chunks: React.ReactNode) => (
    <span dir="ltr" className="font-mono tabular-nums">
      {chunks}
    </span>
  ),
};

/** Dialog surface classes shared by every trackers dialog. */
export const dialogContentClassName =
  "border-border bg-card text-foreground *:data-[slot=dialog-close]:text-foreground-2";
export const dialogFooterClassName = "border-border bg-card-2/40";
