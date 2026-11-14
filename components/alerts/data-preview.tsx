"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Alert } from "@/types/alerts";
import type { StaffMember } from "@/types/user";
import type {
  TrackedAircraft,
  TrackedPilot,
  TrackedZone,
} from "@/types/tracking";
import {
  EMPTY,
  EmptyState,
  HoursTable,
  indexById,
  rowClassName,
} from "../engine-flight-hours/shared";
import AlertMenu from "./alert-menu";
import AlertSheet from "./alert-sheet";
import LocationThumbnail from "./location-thumbnail";
import { SeverityBadge, StatusBadge, useAlertType, userName } from "./shared";

const COLUMNS = [
  { key: "location" },
  { key: "alert" },
  { key: "triggered" },
  { key: "aircraft" },
  { key: "severity" },
  { key: "status" },
  { key: "assignedTo" },
  { key: "actions" },
] as const;

export default function DataPreview({
  alerts,
  aircraft,
  pilots,
  zones,
  staff,
  filtered,
}: {
  alerts: Alert[];
  aircraft: TrackedAircraft[];
  pilots: TrackedPilot[];
  zones: TrackedZone[];
  /** Offered by the row menu's "Assign". */
  staff: StaffMember[];
  /** Whether any filter is applied, for the empty message. */
  filtered: boolean;
}) {
  const t = useTranslations("Alerts.table");
  const format = useFormatter();
  const alertType = useAlertType();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (alerts.length === 0) {
    return <EmptyState>{t(filtered ? "noMatches" : "empty")}</EmptyState>;
  }

  const aircraftById = indexById(aircraft);
  const pilotsById = indexById(pilots);
  const zonesById = indexById(zones);

  const pilotOf = (alert: Alert) =>
    alert.pilotId ? pilotsById.get(alert.pilotId) : undefined;
  const zoneOf = (alert: Alert) =>
    alert.zoneId ? zonesById.get(alert.zoneId) : undefined;

  const selected = alerts.find((alert) => alert.id === selectedId) ?? null;

  const time = (ms: number) =>
    format.dateTime(ms, { hour: "numeric", minute: "2-digit" });

  return (
    <>
      <HoursTable
        columns={COLUMNS.map((column) => ({
          ...column,
          label: column.key === "actions" ? "" : t(`columns.${column.key}`),
        }))}
      >
        {alerts.map((alert) => {
          const profile = aircraftById.get(alert.aircraftId);
          const pilot = pilotOf(alert);
          const pilotName = pilot?.name ?? alert.pilotId;

          return (
            <TableRow
              key={alert.id}
              className={`${rowClassName} cursor-pointer`}
              onClick={() => setSelectedId(alert.id)}
            >
              <TableCell className="ps-4">
                <LocationThumbnail
                  point={{ lat: alert.lat, lon: alert.lon }}
                  zone={zoneOf(alert)}
                  severity={alert.severity}
                  label={alert.location ?? t("locationLabel", { id: alert.id })}
                />
              </TableCell>

              <TableCell>
                {/* The row is clickable; this makes it reachable by keyboard. */}
                <button
                  type="button"
                  className="text-start font-medium text-foreground outline-none focus-visible:underline"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedId(alert.id);
                  }}
                >
                  {alertType(alert)}
                </button>
                <p className="text-xs text-foreground-2">
                  {profile?.name ?? alert.aircraftId}
                </p>
              </TableCell>

              <TableCell>
                <p className="font-medium text-foreground">
                  {format.dateTime(alert.triggeredAt, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-xs text-foreground-2">
                  {time(alert.triggeredAt)}
                  {alert.endedAt ? (
                    <> → {time(alert.endedAt)}</>
                  ) : (
                    alert.isActive && <> · {t("active")}</>
                  )}
                </p>
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Avatar size="sm" className="after:border-border">
                    <AvatarFallback className="bg-card-2 text-[10px] text-muted">
                      {pilot?.initials ??
                        (alert.pilotId ?? alert.aircraftId)
                          .slice(0, 2)
                          .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {profile?.registration ?? alert.aircraftId}
                    </p>
                    {pilotName && (
                      <p className="text-xs text-foreground-2">
                        {t("captain", { name: pilotName })}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <SeverityBadge severity={alert.severity} />
              </TableCell>

              <TableCell>
                <StatusBadge status={alert.status} />
              </TableCell>

              <TableCell>
                {alert.assignedTo ? (
                  <span className="text-foreground-2">
                    {userName(alert.assignedTo)}
                  </span>
                ) : (
                  <span className="text-muted">{EMPTY}</span>
                )}
              </TableCell>

              {/* React events bubble out of the menu's portals; keep them off the row. */}
              <TableCell
                className="pe-4 text-end"
                onClick={(event) => event.stopPropagation()}
              >
                <AlertMenu
                  alert={alert}
                  staff={staff}
                  onView={() => setSelectedId(alert.id)}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </HoursTable>

      <AlertSheet
        alert={selected}
        aircraft={selected ? aircraftById.get(selected.aircraftId) : undefined}
        pilot={selected ? pilotOf(selected) : undefined}
        zone={selected ? zoneOf(selected) : undefined}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
