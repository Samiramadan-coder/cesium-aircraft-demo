import { PlaneTakeoff } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import type { Flight } from "@/types/flights";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";
import {
  AircraftName,
  ComplianceBadge,
  EMPTY,
  EmptyState,
  HoursTable,
  indexById,
  rowClassName,
  useFlightType,
} from "../engine-flight-hours/shared";
import FlightMenu from "./flight-menu";
import RouteThumbnail from "./route-thumbnail";

const COLUMNS = [
  { key: "flight" },
  { key: "dateTime" },
  { key: "aircraft" },
  { key: "pilot" },
  { key: "flightType" },
  { key: "flightTime", numeric: true },
  { key: "maxAltitude", numeric: true },
  { key: "distance", numeric: true },
  { key: "compliance" },
  { key: "actions" },
] as const;

const numericCell = "text-end tabular-nums text-foreground";

export default function DataPreview({
  flights,
  aircraft,
  pilots,
  filtered,
}: {
  flights: Flight[];
  aircraft: TrackedAircraft[];
  pilots: TrackedPilot[];
  /** Whether any filter is applied, for the empty message. */
  filtered: boolean;
}) {
  const t = useTranslations("Flights.table");
  const format = useFormatter();
  const flightType = useFlightType();

  if (flights.length === 0) return (
      <EmptyState>{t(filtered ? "noMatches" : "empty")}</EmptyState>
    );;

  const aircraftById = indexById(aircraft);
  const pilotsById = indexById(pilots);

  const time = (ms: number) =>
    format.dateTime(ms, { hour: "numeric", minute: "2-digit" });

  return (
    <HoursTable
      columns={COLUMNS.map((column) => ({
        ...column,
        label: column.key === "actions" ? "" : t(`columns.${column.key}`),
      }))}
    >
      {[...flights]
        .sort((a, b) => b.engineStartTime - a.engineStartTime)
        .map((flight) => {
          const pilot = flight.pilotId
            ? pilotsById.get(flight.pilotId)
            : undefined;
          const start = flight.takeoffTime ?? flight.engineStartTime;
          const end = flight.landingTime ?? flight.engineShutdownTime;
          const eventCount = flight.events.reduce(
            (sum, event) => sum + event.count,
            0,
          );

          return (
            <TableRow key={flight.id} className={rowClassName}>
              <TableCell className="ps-4">
                <RouteThumbnail
                  route={flight.route}
                  compliance={flight.compliance}
                  label={t("routeLabel", { id: flight.id })}
                />
              </TableCell>

              <TableCell>
                <p className="font-medium text-foreground">
                  {format.dateTime(flight.engineStartTime, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-xs text-foreground-2">
                  {time(start)}
                  {end && <> → {time(end)}</>}
                </p>
              </TableCell>

              <TableCell>
                <AircraftName
                  id={flight.aircraftId}
                  profile={aircraftById.get(flight.aircraftId)}
                />
              </TableCell>

              <TableCell>
                {flight.pilotId ? (
                  <div className="flex items-center gap-2.5">
                    <Avatar size="sm" className="after:border-border">
                      <AvatarFallback className="bg-card-2 text-[10px] text-muted">
                        {pilot?.initials ??
                          flight.pilotId.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">
                      {pilot?.name ?? flight.pilotId}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted">{EMPTY}</span>
                )}
              </TableCell>

              <TableCell>
                <p className="font-medium text-foreground">
                  {flightType(flight.flightType)}
                </p>
                {flight.bookingRef && (
                  <p className="text-xs text-foreground-2">
                    {t("booking", { ref: flight.bookingRef })}
                  </p>
                )}
              </TableCell>

              <TableCell className={numericCell}>
                {t("minutesShort", {
                  value: format.number(flight.flightTimeMin, {
                    maximumFractionDigits: 0,
                  }),
                })}
              </TableCell>
              <TableCell className={numericCell}>
                {t("feet", { value: format.number(flight.maxAltitudeFt) })}
              </TableCell>
              <TableCell className={numericCell}>
                {t("nauticalMiles", {
                  value: format.number(flight.distanceNm, {
                    maximumFractionDigits: 0,
                  }),
                })}
              </TableCell>

              <TableCell>
                <ComplianceBadge compliance={flight.compliance} />
                {flight.compliance !== "compliant" && eventCount > 0 && (
                  <p className="mt-1 text-xs text-foreground-2">
                    {t("events", { count: eventCount })}
                  </p>
                )}
              </TableCell>

              <TableCell className="pe-4">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/flights/${encodeURIComponent(flight.id)}`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className:
                        "border-border bg-card text-foreground hover:bg-card-2",
                    })}
                  >
                    <PlaneTakeoff />
                    {t("replay")}
                  </Link>
                  <FlightMenu flightId={flight.id} />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
    </HoursTable>
  );
}
