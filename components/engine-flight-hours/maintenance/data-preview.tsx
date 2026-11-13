import { useFormatter, useTranslations } from "next-intl";
import { TableCell, TableRow } from "@/components/ui/table";
import type { MaintenanceRecord } from "@/types/engine-flight-hours";
import type { TrackedAircraft } from "@/types/tracking";
import {
  AircraftName,
  EMPTY,
  EmptyState,
  HoursTable,
  indexById,
  rowClassName,
  useHours,
  useServiceType,
} from "../shared";

const COLUMNS = [
  { key: "date" },
  { key: "aircraft" },
  { key: "type" },
  { key: "hoursAtService", numeric: true },
  { key: "engineer" },
  { key: "notes" },
] as const;

/**
 * `completedDate` is a calendar day (YYYY-MM-DD); read it as UTC so it
 * doesn't shift a day in timezones behind UTC.
 */
const toDate = (day: string) => new Date(`${day}T00:00:00Z`);

export default function DataPreview({
  records,
  aircraft,
}: {
  records: MaintenanceRecord[];
  aircraft: TrackedAircraft[];
}) {
  const t = useTranslations("EngineHours.maintenance");
  const format = useFormatter();
  const hours = useHours({ minimumFractionDigits: 0 });
  const serviceType = useServiceType();

  if (records.length === 0) return <EmptyState>{t("empty")}</EmptyState>;

  const aircraftById = indexById(aircraft);

  const rows = [...records].sort(
    (a, b) =>
      b.completedDate.localeCompare(a.completedDate) ||
      Number(b.id) - Number(a.id),
  );

  return (
    <HoursTable
      columns={COLUMNS.map((column) => ({
        ...column,
        label: t(`columns.${column.key}`),
      }))}
    >
      {rows.map((record) => (
        <TableRow key={record.id} className={rowClassName}>
          <TableCell className="ps-4 text-foreground">
            {format.dateTime(toDate(record.completedDate), {
              dateStyle: "medium",
              timeZone: "UTC",
            })}
          </TableCell>
          <TableCell>
            <AircraftName
              id={record.aircraftId}
              profile={aircraftById.get(record.aircraftId)}
            />
          </TableCell>
          <TableCell className="text-foreground">
            {serviceType(record.type)}
          </TableCell>
          <TableCell className="text-end tabular-nums text-foreground">
            {hours(record.hoursAtService)}
          </TableCell>
          <TableCell className="text-foreground">{record.engineer}</TableCell>
          <TableCell className="max-w-64 whitespace-normal pe-4 text-foreground-2">
            {record.notes || EMPTY}
          </TableCell>
        </TableRow>
      ))}
    </HoursTable>
  );
}
