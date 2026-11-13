import { useFormatter, useNow, useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import type { PilotHours } from "@/types/engine-flight-hours";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";
import {
  EMPTY,
  EmptyState,
  HoursTable,
  indexById,
  rowClassName,
  useHours,
} from "../shared";

const COLUMNS = [
  { key: "pilot" },
  { key: "flights", numeric: true },
  { key: "flightHrs", numeric: true },
  { key: "engineHrs", numeric: true },
  { key: "aircraftFlown" },
  { key: "lastFlight" },
] as const;

const numericCell = "text-end tabular-nums text-foreground";

export default function DataPreview({
  hours,
  pilots,
  aircraft,
}: {
  hours: PilotHours[];
  pilots: TrackedPilot[];
  aircraft: TrackedAircraft[];
}) {
  const t = useTranslations("EngineHours.pilots");
  const format = useFormatter();
  const now = useNow();
  const formatHours = useHours();

  if (hours.length === 0) return <EmptyState>{t("empty")}</EmptyState>;

  const pilotsById = indexById(pilots);
  const aircraftById = indexById(aircraft);

  const rows = [...hours]
    .sort((a, b) => b.flightHours - a.flightHours)
    .map((row) => {
      const pilot = pilotsById.get(row.pilotId);
      return {
        ...row,
        name: pilot?.name ?? row.pilotId,
        initials: pilot?.initials ?? row.pilotId.slice(0, 2).toUpperCase(),
        aircraft: row.aircraftIds
          .map((id) => aircraftById.get(id)?.registration ?? id)
          .join(", "),
      };
    });

  return (
    <HoursTable
      columns={COLUMNS.map((column) => ({ ...column, label: t(column.key) }))}
    >
      {rows.map((row) => (
        <TableRow key={row.pilotId} className={rowClassName}>
          <TableCell className="ps-4">
            <div className="flex items-center gap-2.5">
              <Avatar size="sm" className="after:border-border">
                <AvatarFallback className="bg-card-2 text-[10px] text-muted">
                  {row.initials}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">{row.name}</span>
            </div>
          </TableCell>
          <TableCell className={numericCell}>
            {format.number(row.flights)}
          </TableCell>
          <TableCell className={numericCell}>
            {formatHours(row.flightHours)}
          </TableCell>
          <TableCell className={numericCell}>
            {formatHours(row.engineHours)}
          </TableCell>
          <TableCell className="text-muted">{row.aircraft || EMPTY}</TableCell>
          <TableCell className="pe-4 text-muted">
            {row.lastFlightAt
              ? format.relativeTime(row.lastFlightAt, now)
              : t("never")}
          </TableCell>
        </TableRow>
      ))}
    </HoursTable>
  );
}
