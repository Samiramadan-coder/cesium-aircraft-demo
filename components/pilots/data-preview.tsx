import { useLocale, useTranslations } from "next-intl";
import { cn } from "cn";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  EMPTY,
  EmptyState,
  HoursTable,
  rowClassName,
} from "@/components/engine-flight-hours/shared";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";
import PilotMenu from "./pilot-menu";

const COLUMNS = [
  { key: "pilot" },
  { key: "license" },
  { key: "phone" },
  { key: "aircraft" },
  { key: "status" },
  { key: "actions" },
] as const;

/** The pilots from `GET /v1/pilots`, with the aircraft assigned to each. */
export default function DataPreview({
  pilots,
  aircraft,
}: {
  pilots: TrackedPilot[];
  aircraft: TrackedAircraft[];
}) {
  const t = useTranslations("Pilots");
  const locale = useLocale();

  if (pilots.length === 0) {
    return <EmptyState>{t("empty")}</EmptyState>;
  }

  const aircraftByPilot = Map.groupBy(
    aircraft.filter((item) => item.pilotId),
    (item) => item.pilotId!,
  );

  return (
    <HoursTable
      columns={COLUMNS.map((column) => ({
        ...column,
        label: t(`columns.${column.key}`),
      }))}
    >
      {pilots.map((pilot) => {
        const name = (locale === "ar" && pilot.nameAr) || pilot.name;
        const otherName = name === pilot.name ? pilot.nameAr : pilot.name;
        const assigned = aircraftByPilot.get(pilot.id) ?? [];

        return (
          <TableRow
            key={pilot.id}
            className={cn(rowClassName, !pilot.active && "opacity-70")}
          >
            <TableCell className="ps-4">
              <div className="flex items-center gap-2.5">
                <Avatar>
                  <AvatarFallback className="bg-card-2 text-xs font-medium text-foreground">
                    {pilot.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{name}</p>
                  {otherName && (
                    <p className="truncate text-xs text-foreground-2">
                      {otherName}
                    </p>
                  )}
                </div>
              </div>
            </TableCell>

            <TableCell dir="ltr" className="tabular-nums text-foreground">
              {pilot.licenseNumber ?? EMPTY}
            </TableCell>

            <TableCell dir="ltr" className="tabular-nums text-foreground">
              {pilot.phone ?? EMPTY}
            </TableCell>

            <TableCell>
              {assigned.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {assigned.map((item) => (
                    <Badge
                      key={item.id}
                      variant="outline"
                      className="gap-1.5 border-border text-foreground"
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.registration}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-foreground-2">{t("noAircraft")}</span>
              )}
            </TableCell>

            <TableCell>
              <Badge
                variant="outline"
                className={cn(
                  "gap-1.5",
                  pilot.active
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-card-2/40 text-foreground-2",
                )}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {t(pilot.active ? "statuses.active" : "statuses.inactive")}
              </Badge>
            </TableCell>

            <TableCell className="w-12 pe-4 text-end">
              <PilotMenu pilot={pilot} name={name} />
            </TableCell>
          </TableRow>
        );
      })}
    </HoursTable>
  );
}
