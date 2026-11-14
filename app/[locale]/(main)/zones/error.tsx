"use client";

import { useTranslations } from "next-intl";
import RouteError, { type RouteErrorProps } from "@/components/common/route-error";

/** Shown when the zones page fails to load (API down, timeout, …). */
export default function Error(props: RouteErrorProps) {
  const t = useTranslations("Zones.errorPage");

  return (
    <div className="p-4 sm:p-6">
      <RouteError {...props} title={t("title")} description={t("description")} />
    </div>
  );
}
