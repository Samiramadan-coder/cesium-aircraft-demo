"use client";

import { useTranslations } from "next-intl";
import RouteError, { type RouteErrorProps } from "@/components/common/route-error";

/** Error state for the engine-hours `error.tsx` boundaries. */
export default function EngineHoursRouteError(props: RouteErrorProps) {
  const t = useTranslations("EngineHours.errorPage");
  return (
    <RouteError {...props} title={t("title")} description={t("description")} />
  );
}
