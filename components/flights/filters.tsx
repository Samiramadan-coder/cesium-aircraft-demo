"use client";

import { useTransition } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { debounce, useQueryStates } from "nuqs";
import { cn } from "cn";
import { toIsoDay } from "@/lib/search-params/engine-hours";
import {
  AIRCRAFT_TYPES,
  COMPLIANCE_FILTERS,
  FLIGHT_RANGES,
  FLIGHT_TYPES,
  flightsSearchParams,
} from "@/lib/search-params/flights";
import {
  FilterSelect,
  inputClassName,
} from "@/components/engine-flight-hours/filters";
import { useFlightType } from "@/components/engine-flight-hours/shared";
import { Input } from "@/components/ui/input";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";

const ALL = "all";

// `EngineHours.compliance` keys for each filter value.
const COMPLIANCE_LABELS = {
  compliant: "compliant",
  warning: "warnings",
  violation: "violation",
} as const satisfies Record<(typeof COMPLIANCE_FILTERS)[number], string>;

// `EngineHours.details.flightTypes` uses `trialFlight` for `trial`.
const flightTypeKey = (value: string) =>
  value === "trial" ? "trialFlight" : value;

/** The `GET /v1/tracking/flights` filters, kept in the URL. */
export default function Filters({
  aircraft,
  pilots,
}: {
  aircraft: TrackedAircraft[];
  pilots: TrackedPilot[];
}) {
  const t = useTranslations("Flights.filters");
  const compliance = useTranslations("EngineHours.compliance");
  const flightType = useFlightType();
  const [isPending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(flightsSearchParams, {
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

  const { range, from, to } = params;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={isPending}>
      <div className="relative w-64 max-w-full">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          aria-label={t("search")}
          placeholder={t("search")}
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
        label={t("range")}
        items={FLIGHT_RANGES.map((value) => ({
          value,
          label: t(`ranges.${value}`),
        }))}
        value={range}
        className="w-40"
        onChange={(value) => {
          const next = pick(FLIGHT_RANGES, value);
          if (!next) return;
          // A preset range drops the custom dates.
          setFilters(
            next === "custom"
              ? { range: next }
              : { range: next, from: null, to: null },
          );
        }}
      />

      {range === "custom" && (
        <>
          <Input
            type="date"
            aria-label={t("from")}
            value={from ? toIsoDay(from) : ""}
            max={to ? toIsoDay(to) : undefined}
            onChange={(event) => setDay("from", event.target.value)}
            className={cn(inputClassName, "w-40")}
          />
          <Input
            type="date"
            aria-label={t("to")}
            value={to ? toIsoDay(to) : ""}
            min={from ? toIsoDay(from) : undefined}
            onChange={(event) => setDay("to", event.target.value)}
            className={cn(inputClassName, "w-40")}
          />
        </>
      )}

      <FilterSelect
        label={t("aircraft")}
        items={withAll(
          t("allAircraft"),
          aircraft.map((item) => ({ value: item.id, label: item.registration })),
        )}
        value={params.aircraftId ?? ALL}
        className="w-40"
        onChange={(value) =>
          setFilters({ aircraftId: value === ALL ? null : value })
        }
      />
      <FilterSelect
        label={t("aircraftType")}
        items={withAll(
          t("allAircraftTypes"),
          AIRCRAFT_TYPES.map((value) => ({
            value,
            label: t(`aircraftTypes.${value}`),
          })),
        )}
        value={params.aircraftType ?? ALL}
        className="w-48"
        onChange={(value) =>
          setFilters({ aircraftType: pick(AIRCRAFT_TYPES, value) })
        }
      />
      <FilterSelect
        label={t("pilot")}
        items={withAll(
          t("allPilots"),
          pilots.map((item) => ({ value: item.id, label: item.name })),
        )}
        value={params.pilotId ?? ALL}
        className="w-44"
        onChange={(value) =>
          setFilters({ pilotId: value === ALL ? null : value })
        }
      />
      <FilterSelect
        label={t("flightType")}
        items={withAll(
          t("allFlightTypes"),
          FLIGHT_TYPES.map((value) => ({
            value,
            label: flightType(flightTypeKey(value)),
          })),
        )}
        value={params.flightType ?? ALL}
        className="w-40"
        onChange={(value) =>
          setFilters({ flightType: pick(FLIGHT_TYPES, value) })
        }
      />
      <FilterSelect
        label={t("compliance")}
        items={withAll(
          t("allCompliance"),
          COMPLIANCE_FILTERS.map((value) => ({
            value,
            label: compliance(COMPLIANCE_LABELS[value]),
          })),
        )}
        value={params.compliance ?? ALL}
        className="w-40"
        onChange={(value) =>
          setFilters({ compliance: pick(COMPLIANCE_FILTERS, value) })
        }
      />
    </div>
  );
}
