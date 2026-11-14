"use client";

import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { flightsSearchParams } from "@/lib/search-params/flights";
import { Button } from "@/components/ui/button";
import type { Paginated } from "@/types/flights";

const buttonClassName = "border-border bg-card text-foreground hover:bg-card-2";

/** `?page=` for the flights list, with the API's paginator meta. */
export default function Pagination({
  meta,
}: {
  meta: Paginated<unknown>["meta"];
}) {
  const t = useTranslations("Flights.pagination");
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();
  const [, setParams] = useQueryStates(
    { page: flightsSearchParams.page },
    { shallow: false, startTransition, scroll: true },
  );

  if (meta.total === 0) return null;

  const go = (page: number) => setParams({ page: page > 1 ? page : null });

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 text-sm text-foreground-2"
      aria-busy={isPending}
    >
      <p className="tabular-nums">
        {t("showing", {
          from: format.number(meta.from ?? 0),
          to: format.number(meta.to ?? 0),
          total: format.number(meta.total),
        })}
      </p>

      {meta.last_page > 1 && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={buttonClassName}
            disabled={meta.current_page <= 1 || isPending}
            onClick={() => go(meta.current_page - 1)}
          >
            <ChevronLeft className="rtl:rotate-180" />
            {t("previous")}
          </Button>
          <span className="tabular-nums">
            {t("page", {
              page: format.number(meta.current_page),
              total: format.number(meta.last_page),
            })}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={buttonClassName}
            disabled={meta.current_page >= meta.last_page || isPending}
            onClick={() => go(meta.current_page + 1)}
          >
            {t("next")}
            <ChevronRight className="rtl:rotate-180" />
          </Button>
        </div>
      )}
    </div>
  );
}
