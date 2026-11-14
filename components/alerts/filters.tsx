"use client";

import { useTransition } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { debounce, useQueryStates } from "nuqs";
import { cn } from "cn";
import { toIsoDay } from "@/lib/search-params/engine-hours";
import {
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  ALERT_TYPES,
  alertsSearchParams,
} from "@/lib/search-params/alerts";
import {
  FilterSelect,
  inputClassName,
} from "@/components/engine-flight-hours/filters";
import { Input } from "@/components/ui/input";
import type { TrackedAircraft } from "@/types/tracking";

const ALL = "all";
const ACTIVE = "active";

/** The `GET /v1/tracking/alerts` filters, kept in the URL. */
export default function Filters({ aircraft }: { aircraft: TrackedAircraft[] }) {
  const t = useTranslations("Alerts");
  const [isPending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(alertsSearchParams, {
    // The list is fetched on the server, so every change re-renders it.
    shallow: false,
    startTransition,
  });

  /** Any filter change goes back to the first page. */
  const setFilters = (
    values: Parameters<typeof setParams>[0],
    options?: Parameters<typeof setParams>[1],
  ) => setParams({ ...values, page: null }, options);

  const pick = <T extends string>(list: readonly T[], value: string) =>
    list.find((item) => item === value) ?? null;

  const withAll = (label: string, items: { value: string; label: string }[]) => [
    { value: ALL, label },
    ...items,
  ];

  const setDay = (key: "from" | "to", value: string) =>
    setFilters({ [key]: value ? new Date(`${value}T00:00:00Z`) : null });

  const { from, to } = params;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={isPending}>
      <div className="relative w-64 max-w-full">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          aria-label={t("filters.search")}
          placeholder={t("filters.search")}
          value={params.search}
          onChange={(event) => {
            const value = event.target.value;
            // The input updates at once; the URL (and the fetch) after a
            // pause in typing. Clearing applies right away.
            setFilters(
              { search: value },
              value ? { limitUrlUpdates: debounce(350) } : undefined,
            );
          }}
          className={cn(inputClassName, "ps-8")}
        />
      </div>

      <FilterSelect
        label={t("filters.severity")}
        items={withAll(
          t("filters.allSeverities"),
          ALERT_SEVERITIES.map((value) => ({
            value,
            label: t(`severity.${value}`),
          })),
        )}
        value={params.severity ?? ALL}
        className="w-36"
        onChange={(value) =>
          setFilters({ severity: pick(ALERT_SEVERITIES, value) })
        }
      />
      <FilterSelect
        label={t("filters.status")}
        items={withAll(
          t("filters.allStatuses"),
          ALERT_STATUSES.map((value) => ({
            value,
            label: t(`status.${value}`),
          })),
        )}
        value={params.status ?? ALL}
        className="w-40"
        onChange={(value) => setFilters({ status: pick(ALERT_STATUSES, value) })}
      />
      <FilterSelect
        label={t("filters.type")}
        items={withAll(
          t("filters.allTypes"),
          ALERT_TYPES.map((value) => ({ value, label: t(`types.${value}`) })),
        )}
        value={params.type ?? ALL}
        className="w-44"
        onChange={(value) => setFilters({ type: pick(ALERT_TYPES, value) })}
      />
      <FilterSelect
        label={t("filters.aircraft")}
        items={withAll(
          t("filters.allAircraft"),
          aircraft.map((item) => ({ value: item.id, label: item.registration })),
        )}
        value={params.aircraftId ?? ALL}
        className="w-40"
        onChange={(value) =>
          setFilters({ aircraftId: value === ALL ? null : value })
        }
      />
      <FilterSelect
        label={t("filters.activity")}
        items={[
          { value: ALL, label: t("filters.allAlerts") },
          { value: ACTIVE, label: t("filters.activeOnly") },
        ]}
        value={params.activeOnly ? ACTIVE : ALL}
        className="w-40"
        onChange={(value) =>
          setFilters({ activeOnly: value === ACTIVE ? true : null })
        }
      />

      <Input
        type="date"
        aria-label={t("filters.from")}
        title={t("filters.from")}
        value={from ? toIsoDay(from) : ""}
        max={to ? toIsoDay(to) : undefined}
        onChange={(event) => setDay("from", event.target.value)}
        className={cn(inputClassName, "w-40")}
      />
      <Input
        type="date"
        aria-label={t("filters.to")}
        title={t("filters.to")}
        value={to ? toIsoDay(to) : ""}
        min={from ? toIsoDay(from) : undefined}
        onChange={(event) => setDay("to", event.target.value)}
        className={cn(inputClassName, "w-40")}
      />
    </div>
  );
}
