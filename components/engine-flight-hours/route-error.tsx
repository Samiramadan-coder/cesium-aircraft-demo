"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** Error state for the engine-hours `error.tsx` boundaries. */
export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("EngineHours");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl bg-card px-6 py-10 text-center ring-1 ring-foreground/10"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <TriangleAlert className="size-6" />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold text-foreground">
          {t("errorPage.title")}
        </h1>
        <p className="text-sm text-foreground-2">
          {t("errorPage.description")}
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted">
            {t("errorPage.reference", { digest: error.digest })}
          </p>
        )}
      </div>
      <Button type="button" size="lg" onClick={() => retry()}>
        <RotateCw />
        {t("details.retry")}
      </Button>
    </div>
  );
}
