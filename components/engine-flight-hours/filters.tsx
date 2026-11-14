"use client";

import { useTransition } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { debounce, useQueryStates } from "nuqs";
import { cn } from "cn";
import {
  PERIODS,
  dailyLogParams,
  maintenanceParams,
  periodParams,
  toIsoDay,
  type Period,
} from "@/lib/search-params/engine-hours";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MaintenanceAircraftOption } from "@/types/engine-flight-hours";
import { SERVICE_TYPES } from "./maintenance/service-types";
import { useServiceType } from "./shared";

// The data is fetched on the server, so every change re-renders the page.
const serverOptions = { shallow: false } as const;

const ALL = "all";

// `EngineHours.periods` keys for each API value.
const PERIOD_LABELS = {
  week: "thisWeek",
  month: "thisMonth",
  last30: "last30Days",
  all: "allTime",
  custom: "custom",
} as const satisfies Record<Period, string>;

const triggerClassName =
  "border-border bg-card text-foreground hover:bg-card-2 data-[size=default]:h-9";
export const inputClassName =
  "h-9 border-border bg-card text-foreground placeholder:text-muted hover:bg-card-2";

type Option = { value: string; label: string };

export function FilterSelect({
  label,
  items,
  value,
  onChange,
  className,
}: {
  label: string;
  items: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next: string | null) => next && onChange(next)}
    >
      <SelectTrigger aria-label={label} className={cn(triggerClassName, className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-card text-foreground ring-border">
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            className="focus:bg-card-2 focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground"
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** `?period=`, plus `?from=&to=` for a custom range. */
export function PeriodFilter() {
  const t = useTranslations("EngineHours");
  const [isPending, startTransition] = useTransition();
  const [{ period, from, to }, setParams] = useQueryStates(periodParams, {
    ...serverOptions,
    startTransition,
  });

  const items = PERIODS.map((value) => ({
    value,
    label: t(`periods.${PERIOD_LABELS[value]}`),
  }));

  const setDay = (key: "from" | "to", value: string) =>
    setParams({ [key]: value ? new Date(`${value}T00:00:00Z`) : null });

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={isPending}>
      {period === "custom" && (
        <>
          <Input
            type="date"
            aria-label={t("filters.from")}
            value={from ? toIsoDay(from) : ""}
            max={to ? toIsoDay(to) : undefined}
            onChange={(event) => setDay("from", event.target.value)}
            className={cn(inputClassName, "w-40")}
          />
          <Input
            type="date"
            aria-label={t("filters.to")}
            value={to ? toIsoDay(to) : ""}
            min={from ? toIsoDay(from) : undefined}
            onChange={(event) => setDay("to", event.target.value)}
            className={cn(inputClassName, "w-40")}
          />
        </>
      )}

      <FilterSelect
        label={t("filters.period")}
        items={items}
        value={period}
        className="w-40"
        onChange={(value) => {
          const next = PERIODS.find((item) => item === value);
          if (!next) return;
          // A preset period drops the custom range.
          setParams(
            next === "custom"
              ? { period: next }
              : { period: next, from: null, to: null },
          );
        }}
      />
    </div>
  );
}

/** `?search=` (pilot or aircraft) on the daily log. */
export function DailyLogSearch() {
  const t = useTranslations("EngineHours.filters");
  const [isPending, startTransition] = useTransition();
  const [{ search }, setParams] = useQueryStates(
    { search: dailyLogParams.search },
    { ...serverOptions, startTransition },
  );

  return (
    <div className="relative w-64 max-w-full" aria-busy={isPending}>
      <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <Input
        type="search"
        aria-label={t("search")}
        placeholder={t("search")}
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
  );
}

/** `?aircraftId=&type=` on the maintenance history. */
export function MaintenanceFilters({
  aircraft,
}: {
  aircraft: MaintenanceAircraftOption[];
}) {
  const t = useTranslations("EngineHours.filters");
  const serviceType = useServiceType();
  const [isPending, startTransition] = useTransition();
  const [{ aircraftId, type }, setParams] = useQueryStates(
    { aircraftId: maintenanceParams.aircraftId, type: maintenanceParams.type },
    { ...serverOptions, startTransition },
  );

  const aircraftItems = [
    { value: ALL, label: t("allAircraft") },
    ...aircraft.map((item) => ({ value: item.id, label: item.registration })),
  ];
  const typeItems = [
    { value: ALL, label: t("allTypes") },
    ...SERVICE_TYPES.map((value) => ({ value, label: serviceType(value) })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={isPending}>
      <FilterSelect
        label={t("aircraft")}
        items={aircraftItems}
        value={aircraftId ?? ALL}
        className="w-40"
        onChange={(value) =>
          setParams({ aircraftId: value === ALL ? null : value })
        }
      />
      <FilterSelect
        label={t("type")}
        items={typeItems}
        value={type ?? ALL}
        className="w-48"
        onChange={(value) =>
          setParams({
            type: SERVICE_TYPES.find((item) => item === value) ?? null,
          })
        }
      />
    </div>
  );
}
