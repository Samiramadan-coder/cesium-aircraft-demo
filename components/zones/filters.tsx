"use client";

import { useTransition } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { debounce, useQueryStates } from "nuqs";
import { cn } from "cn";
import {
  ZONE_ACTIVE_VALUES,
  zonesSearchParams,
} from "@/lib/search-params/zones";
import {
  FilterSelect,
  inputClassName,
} from "@/components/engine-flight-hours/filters";
import { Input } from "@/components/ui/input";

const ALL = "all";

/** `?search=&active=` on the zones list. */
export default function Filters() {
  const t = useTranslations("Zones");
  const [isPending, startTransition] = useTransition();
  const [{ search, active }, setParams] = useQueryStates(zonesSearchParams, {
    // The list is fetched on the server, so every change re-renders it.
    shallow: false,
    startTransition,
  });

  const statusItems = [
    { value: ALL, label: t("filters.allStatuses") },
    { value: "1", label: t("statuses.active") },
    { value: "0", label: t("statuses.inactive") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={isPending}>
      <div className="relative w-64 max-w-full">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          aria-label={t("filters.search")}
          placeholder={t("filters.search")}
          value={search}
          onChange={(event) => {
            const value = event.target.value;
            // The input updates at once; the URL (and the fetch) after a
            // pause in typing. Clearing applies right away.
            setParams(
              { search: value },
              value ? { limitUrlUpdates: debounce(350) } : undefined,
            );
          }}
          className={cn(inputClassName, "ps-8")}
        />
      </div>

      <FilterSelect
        label={t("columns.status")}
        items={statusItems}
        value={active ?? ALL}
        className="w-40"
        onChange={(value) =>
          setParams({
            active: ZONE_ACTIVE_VALUES.find((item) => item === value) ?? null,
          })
        }
      />
    </div>
  );
}
