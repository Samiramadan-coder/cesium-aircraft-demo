"use client";

import { useTranslations } from "next-intl";
import RouteError, { type RouteErrorProps } from "@/components/common/route-error";

/** The flight history failed to load (KPIs, list or summary request). */
export default function Error(props: RouteErrorProps) {
  const t = useTranslations("Flights.errorPage");

  return (
    <div className="p-4 sm:p-6">
      <RouteError {...props} title={t("title")} description={t("description")} />
    </div>
  );
}
