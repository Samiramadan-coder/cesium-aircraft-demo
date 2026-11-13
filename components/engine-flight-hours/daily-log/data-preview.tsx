import { useFormatter, useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DailyLogEntry } from "@/types/engine-flight-hours";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";
import { ComplianceBadge, useFlightType } from "../fleet/shared";

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

  if (logs.length === 0) {
    return (
      <p className="rounded-xl bg-card p-8 text-center text-sm text-foreground-2 ring-1 ring-foreground/10">
        {t("empty")}
      </p>
    );
  }

  const hobbs = (value: number) =>
    format.number(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const minutes = (value: number) =>
    t("minutes", { value: format.number(Math.round(value)) });

  const rows = [...logs].sort((a, b) => b.takeoffTime - a.takeoffTime);

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            {COLUMNS.map((column) => (
              <TableHead
                key={column.key}
                className={
                  "numeric" in column
                    ? "text-end text-foreground"
                    : "text-foreground first:ps-4 last:pe-4"
                }
              >
                {t(`columns.${column.key}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((log) => {
            const plane = aircraft.find((item) => item.id === log.aircraftId);
            const pilot = pilots.find((item) => item.id === log.pilotId);

            return (
              <TableRow
                key={log.flightId}
                className="border-border hover:bg-card-2/50"
              >
                <TableCell className="ps-4 text-foreground">
                  {format.dateTime(log.takeoffTime, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <p className="font-medium text-foreground">
                    {plane?.registration ?? log.aircraftId}
                  </p>
                  {plane?.name && (
                    <p className="text-xs text-foreground-2">{plane.name}</p>
                  )}
                </TableCell>
                <TableCell className="text-foreground">
                  {pilot?.name ?? t("unknownPilot")}
                </TableCell>
                <TableCell className="text-muted">
                  {flightType(log.flightType)}
                </TableCell>
                <TableCell className="text-end tabular-nums text-foreground">
                  {hobbs(log.hobbsStart)}
                </TableCell>
                <TableCell className="text-end tabular-nums text-foreground">
                  {hobbs(log.hobbsEnd)}
                </TableCell>
                <TableCell className="text-end tabular-nums text-foreground">
                  {minutes(log.flightTimeMin)}
                </TableCell>
                <TableCell className="text-end tabular-nums text-foreground">
                  {minutes(log.engineTimeMin)}
                </TableCell>
                <TableCell className="pe-4">
                  <ComplianceBadge compliance={log.compliance} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
