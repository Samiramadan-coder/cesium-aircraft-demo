import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useHours } from "../fleet/shared";
import type { PilotHours } from "@/types/engine-flight-hours";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useFormatter, useNow, useTranslations } from "next-intl";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";

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

  if (hours.length === 0) {
    return (
      <p className="rounded-xl bg-card p-8 text-center text-sm text-foreground-2 ring-1 ring-foreground/10">
        {t("empty")}
      </p>
    );
  }

  const rows = [...hours]
    .sort((a, b) => b.flightHours - a.flightHours)
    .map((row) => {
      const pilot = pilots.find((item) => item.id === row.pilotId);
      return {
        ...row,
        name: pilot?.name ?? row.pilotId,
        initials: pilot?.initials ?? row.pilotId.slice(0, 2).toUpperCase(),
        aircraft: row.aircraftIds
          .map(
            (id) => aircraft.find((item) => item.id === id)?.registration ?? id,
          )
          .join(", "),
      };
    });

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="ps-4 text-foreground">{t("pilot")}</TableHead>
            <TableHead className="text-end text-foreground">
              {t("flights")}
            </TableHead>
            <TableHead className="text-end text-foreground">
              {t("flightHrs")}
            </TableHead>
            <TableHead className="text-end text-foreground">
              {t("engineHrs")}
            </TableHead>
            <TableHead className="text-foreground">
              {t("aircraftFlown")}
            </TableHead>
            <TableHead className="pe-4 text-foreground">
              {t("lastFlight")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.pilotId}
              className="border-border hover:bg-card-2/50"
            >
              <TableCell className="ps-4">
                <div className="flex items-center gap-2.5">
                  <Avatar size="sm" className="after:border-border">
                    <AvatarFallback className="bg-card-2 text-[10px] text-muted">
                      {row.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">
                    {row.name}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-end tabular-nums text-foreground">
                {format.number(row.flights)}
              </TableCell>
              <TableCell className="text-end tabular-nums text-foreground">
                {formatHours(row.flightHours)}
              </TableCell>
              <TableCell className="text-end tabular-nums text-foreground">
                {formatHours(row.engineHours)}
              </TableCell>
              <TableCell className="text-muted">
                {row.aircraft || "—"}
              </TableCell>
              <TableCell className="pe-4 text-muted">
                {row.lastFlightAt
                  ? format.relativeTime(row.lastFlightAt, now)
                  : t("never")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
