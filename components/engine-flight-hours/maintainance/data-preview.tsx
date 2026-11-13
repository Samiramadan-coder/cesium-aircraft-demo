import { useFormatter, useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MaintenanceRecord } from "@/types/engine-flight-hours";
import type { TrackedAircraft } from "@/types/tracking";
import { useServiceType } from "../fleet/shared";

const COLUMNS = [
  { key: "date" },
  { key: "aircraft" },
  { key: "type" },
  { key: "hoursAtService", numeric: true },
  { key: "engineer" },
  { key: "notes" },
] as const;

export default function DataPreview({
  records,
  aircraft,
}: {
  records: MaintenanceRecord[];
  aircraft: TrackedAircraft[];
}) {
  const t = useTranslations("EngineHours");
  const format = useFormatter();
  const serviceType = useServiceType();

  if (records.length === 0) {
    return (
      <p className="rounded-xl bg-card p-8 text-center text-sm text-foreground-2 ring-1 ring-foreground/10">
        {t("maintenance.empty")}
      </p>
    );
  }

  // `completedDate` is a calendar day (YYYY-MM-DD); read it as UTC so it
  // doesn't shift a day in timezones behind UTC.
  const toDate = (day: string) => new Date(`${day}T00:00:00Z`);

  const rows = [...records].sort(
    (a, b) =>
      b.completedDate.localeCompare(a.completedDate) ||
      Number(b.id) - Number(a.id),
  );

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
                {t(`maintenance.columns.${column.key}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((record) => {
            const plane = aircraft.find((item) => item.id === record.aircraftId);

            return (
              <TableRow
                key={record.id}
                className="border-border hover:bg-card-2/50"
              >
                <TableCell className="ps-4 text-foreground">
                  {format.dateTime(toDate(record.completedDate), {
                    dateStyle: "medium",
                    timeZone: "UTC",
                  })}
                </TableCell>
                <TableCell>
                  <p className="font-medium text-foreground">
                    {plane?.registration ?? record.aircraftId}
                  </p>
                  {plane?.name && (
                    <p className="text-xs text-foreground-2">{plane.name}</p>
                  )}
                </TableCell>
                <TableCell className="text-foreground">
                  {serviceType(record.type)}
                </TableCell>
                <TableCell className="text-end tabular-nums text-foreground">
                  {t("hoursValue", {
                    value: format.number(record.hoursAtService, {
                      maximumFractionDigits: 1,
                    }),
                  })}
                </TableCell>
                <TableCell className="text-foreground">
                  {record.engineer}
                </TableCell>
                <TableCell className="max-w-64 whitespace-normal pe-4 text-foreground-2">
                  {record.notes || "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
