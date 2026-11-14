"use client";

import { useTransition } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { debounce, useQueryStates } from "nuqs";
import { cn } from "cn";
import {
  TRACKER_STATUSES,
  trackersSearchParams,
} from "@/lib/search-params/trackers";
import {
  FilterSelect,
  inputClassName,
} from "@/components/engine-flight-hours/filters";
import { Input } from "@/components/ui/input";
import type { TrackedAircraft } from "@/types/tracking";
import { SIM_CARRIERS } from "./options";

const ALL = "all";

/** `?search=&status=&model=&operator=&aircraftId=` on the trackers list. */
export default function Filters({
  models,
  aircraft,
}: {
  models: string[];
  aircraft: TrackedAircraft[];
}) {
  const t = useTranslations("Trackers");
  const [isPending, startTransition] = useTransition();
  const [{ search, status, model, operator, aircraftId }, setParams] =
    useQueryStates(trackersSearchParams, {
      // The list is fetched on the server, so every change re-renders it.
      shallow: false,
      startTransition,
    });

  const statusItems = [
    { value: ALL, label: t("filters.allStatuses") },
    ...TRACKER_STATUSES.map((value) => ({
      value,
      label: t(`statuses.${value}`),
    })),
  ];
  const modelItems = [
    { value: ALL, label: t("filters.allModels") },
    ...models.map((value) => ({ value, label: value })),
  ];
  const operatorItems = [
    { value: ALL, label: t("filters.allOperators") },
    ...SIM_CARRIERS.map(({ value }) => ({ value, label: value })),
  ];
  const aircraftItems = [
    { value: ALL, label: t("filters.allAircraft") },
    ...aircraft.map((item) => ({ value: item.id, label: item.registration })),
  ];

  const orNull = (value: string) => (value === ALL ? null : value);

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
        label={t("status")}
        items={statusItems}
        value={status ?? ALL}
        className="w-40"
        onChange={(value) =>
          setParams({
            status: TRACKER_STATUSES.find((item) => item === value) ?? null,
          })
        }
      />
      <FilterSelect
        label={t("filters.model")}
        items={modelItems}
        value={model ?? ALL}
        className="w-48"
        onChange={(value) => setParams({ model: orNull(value) })}
      />
      <FilterSelect
        label={t("filters.operator")}
        items={operatorItems}
        value={operator ?? ALL}
        className="w-40"
        onChange={(value) => setParams({ operator: orNull(value) })}
      />
      <FilterSelect
        label={t("aircraft")}
        items={aircraftItems}
        value={aircraftId ?? ALL}
        className="w-40"
        onChange={(value) => setParams({ aircraftId: orNull(value) })}
      />
    </div>
  );
}
