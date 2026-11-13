import { useFormatter, useTranslations } from "next-intl";
import { TableCell, TableRow } from "@/components/ui/table";
import type { DailyLogEntry } from "@/types/engine-flight-hours";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";
import {
  AircraftName,
  ComplianceBadge,
  EmptyState,
  HoursTable,
  indexById,
  rowClassName,
  useFlightType,
} from "../shared";

const COLUMNS = [
  { key: "date" },
  { key: "aircraft" },
  { key: "pilot" },
  { key: "type" },
  { key: "hobbsStart", numeric: true },
  { key: "hobbsEnd", numeric: true },
  { key: "flightTime", numeric: true },
  { key: "engineTime", numeric: true },
  { key: "compliance" },
] as const;

const numericCell = "text-end tabular-nums text-foreground";

export default function DataPreview({
  logs,
  pilots,
  aircraft,
}: {
  logs: DailyLogEntry[];
  pilots: TrackedPilot[];
  aircraft: TrackedAircraft[];
}) {
  const t = useTranslations("EngineHours.dailyLog");
  const format = useFormatter();
  const flightType = useFlightType();

  if (logs.length === 0) return <EmptyState>{t("empty")}</EmptyState>;

  const aircraftById = indexById(aircraft);
  const pilotsById = indexById(pilots);

  const hobbs = (value: number) =>
    format.number(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const minutes = (value: number) =>
    t("minutes", { value: format.number(Math.round(value)) });

  const rows = [...logs].sort((a, b) => b.takeoffTime - a.takeoffTime);

  return (
    <HoursTable
      columns={COLUMNS.map((column) => ({
        ...column,
        label: t(`columns.${column.key}`),
      }))}
    >
      {rows.map((log) => (
        <TableRow key={log.flightId} className={rowClassName}>
          <TableCell className="ps-4 text-foreground">
            {format.dateTime(log.takeoffTime, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </TableCell>
          <TableCell>
            <AircraftName
              id={log.aircraftId}
              profile={aircraftById.get(log.aircraftId)}
            />
          </TableCell>
          <TableCell className="text-foreground">
            {(log.pilotId && pilotsById.get(log.pilotId)?.name) ||
              t("unknownPilot")}
          </TableCell>
          <TableCell className="text-muted">
            {flightType(log.flightType)}
          </TableCell>
          <TableCell className={numericCell}>{hobbs(log.hobbsStart)}</TableCell>
          <TableCell className={numericCell}>{hobbs(log.hobbsEnd)}</TableCell>
          <TableCell className={numericCell}>
            {minutes(log.flightTimeMin)}
          </TableCell>
          <TableCell className={numericCell}>
            {minutes(log.engineTimeMin)}
          </TableCell>
          <TableCell className="pe-4">
            <ComplianceBadge compliance={log.compliance} />
          </TableCell>
        </TableRow>
      ))}
    </HoursTable>
  );
}
