"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import StatusCard from "./status-card";

export type RouteErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

/** The body of every `error.tsx` boundary; each route passes its own copy. */
export default function RouteError({
  error,
  retry,
  title,
  description,
}: RouteErrorProps & { title: string; description: string }) {
  const t = useTranslations("Common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusCard
      role="alert"
      icon={TriangleAlert}
      title={title}
      description={
        <>
          <p>{description}</p>
          {error.digest && (
            <p className="mt-1.5 font-mono text-xs text-muted">
              {t("errorReference", { digest: error.digest })}
            </p>
          )}
        </>
      }
    >
      <Button type="button" size="lg" onClick={() => retry()}>
        <RotateCw />
        {t("retry")}
      </Button>
    </StatusCard>
  );
}
