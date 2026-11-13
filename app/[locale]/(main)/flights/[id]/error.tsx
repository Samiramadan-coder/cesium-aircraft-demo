"use client";

import { useTranslations } from "next-intl";
import RouteError, { type RouteErrorProps } from "@/components/common/route-error";
import { BackLink } from "@/components/flights/details/details-header";

/** The replay, events or zones request failed for this flight. */
export default function Error(props: RouteErrorProps) {
  const t = useTranslations("Flights.details.error");

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <BackLink />
      <RouteError {...props} title={t("title")} description={t("description")} />
    </div>
  );
}
