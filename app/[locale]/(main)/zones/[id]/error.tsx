"use client";

import { useTranslations } from "next-intl";
import RouteError, { type RouteErrorProps } from "@/components/common/route-error";
import { BackLink } from "@/components/zones/zone-details";

/** The zones request failed for this page. */
export default function Error(props: RouteErrorProps) {
  const t = useTranslations("Zones.errorPage");

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <BackLink />
      <RouteError {...props} title={t("title")} description={t("description")} />
    </div>
  );
}
