import { useFormatter, useLocale, useTranslations } from "next-intl";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  EMPTY,
  EmptyState,
  HoursTable,
  indexById,
  rowClassName,
} from "@/components/engine-flight-hours/shared";
import {
  AircraftCell,
  TrackerStatusBadge,
} from "@/components/trackers/shared";
import type { Tracker } from "@/types/trackers";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";
import AircraftMenu from "./aircraft-menu";

const COLUMNS = [
  { key: "aircraft" },
  { key: "type" },
  { key: "pilot" },
  { key: "tracker" },
  { key: "serviceInterval", numeric: true },
  { key: "status" },
  { key: "actions" },
] as const;

/** The fleet from `GET /v1/aircraft`, with pilot and tracker names resolved. */
export default function DataPreview({
  aircraft,
  pilots,
  trackers,
}: {
  aircraft: TrackedAircraft[];
  pilots: TrackedPilot[];
  trackers: Tracker[];
}) {
  const t = useTranslations("Aircrafts");
  const format = useFormatter();
  const locale = useLocale();

  if (aircraft.length === 0) {
    return <EmptyState>{t("empty")}</EmptyState>;
  }

  const pilotsById = indexById(pilots);
  const trackersById = indexById(trackers);
  const localized = <T extends { name: string; nameAr: string | null }>(
    item: T,
  ) => (locale === "ar" && item.nameAr) || item.name;

  return (
    <HoursTable
      columns={COLUMNS.map((column) => ({
        ...column,
        label: t(`columns.${column.key}`),
      }))}
    >
      {aircraft.map((item) => {
        const pilot = item.pilotId ? pilotsById.get(item.pilotId) : undefined;
        const tracker = item.trackerId
          ? trackersById.get(item.trackerId)
          : undefined;

        return (
          <TableRow
            key={item.id}
            className={cn(rowClassName, !item.active && "opacity-70")}
          >
            <TableCell className="ps-4">
              <AircraftCell aircraft={{ ...item, name: localized(item) }} />
            </TableCell>

            <TableCell className="text-foreground">{item.type}</TableCell>

            <TableCell>
              {pilot ? (
                <span className="text-foreground">{localized(pilot)}</span>
              ) : (
                <span className="text-foreground-2">
                  {item.pilotId ?? t("noPilot")}
                </span>
              )}
            </TableCell>

            <TableCell>
              {tracker ? (
                <div className="space-y-1">
                  <p className="text-foreground">{tracker.model}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-foreground-2">
                      {tracker.imei}
                    </span>
                    <TrackerStatusBadge status={tracker.status} />
                  </div>
                </div>
              ) : (
                <span className="text-foreground-2">
                  {item.trackerId ?? t("noTracker")}
                </span>
              )}
            </TableCell>

            <TableCell className="text-end tabular-nums text-foreground">
              {item.serviceIntervalHours
                ? t("hours", { value: format.number(item.serviceIntervalHours) })
                : EMPTY}
            </TableCell>

            <TableCell>
              <Badge
                variant="outline"
                className={cn(
                  "gap-1.5",
                  item.active
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-card-2/40 text-foreground-2",
                )}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {t(item.active ? "statuses.active" : "statuses.inactive")}
              </Badge>
            </TableCell>

            <TableCell className="w-12 pe-4 text-end">
              <AircraftMenu aircraft={item} pilots={pilots} />
            </TableCell>
          </TableRow>
        );
      })}
    </HoursTable>
  );
}
