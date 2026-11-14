import { useFormatter, useTranslations } from "next-intl";
import { cn } from "cn";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  EmptyState,
  HoursTable,
  rowClassName,
} from "@/components/engine-flight-hours/shared";
import { DATE_TIME_FORMAT } from "@/components/trackers/shared";
import type { TrackedZone } from "@/types/tracking";
import { ZoneStatusBadge, useLabel, useZoneName } from "./shared";
import ZoneMenu from "./zone-menu";

const COLUMNS = [
  { key: "zone" },
  { key: "shape" },
  { key: "altitude" },
  { key: "warnings" },
  { key: "appliesTo" },
  { key: "status" },
  { key: "lastEdited" },
  { key: "actions" },
] as const;

/** The flight zones from `GET /v1/tracking/zones`. */
export default function DataPreview({
  zones,
  filtered = false,
}: {
  zones: TrackedZone[];
  /** Whether a search or filter is applied, for the empty message. */
  filtered?: boolean;
}) {
  const t = useTranslations("Zones");
  const format = useFormatter();
  const zoneName = useZoneName();
  const kind = useLabel("kinds");
  const appliesTo = useLabel("appliesToValues");

  if (zones.length === 0) {
    return (
      <EmptyState>{t(filtered ? "filters.noMatches" : "empty")}</EmptyState>
    );
  }

  const number = (value: number) =>
    format.number(value, { maximumFractionDigits: 2 });

  return (
    <HoursTable
      columns={COLUMNS.map((column) => ({
        ...column,
        label: t(`columns.${column.key}`),
      }))}
    >
      {zones.map((zone) => {
        const name = zoneName(zone);

        return (
          <TableRow
            key={zone.id}
            className={cn(rowClassName, !zone.active && "opacity-70")}
          >
            <TableCell className="ps-4">
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-1.5 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: zone.color }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{name}</p>
                  <p className="text-xs text-foreground-2">{kind(zone.kind)}</p>
                  {zone.notes && (
                    <p
                      className="mt-0.5 max-w-72 truncate text-xs text-muted"
                      title={zone.notes}
                    >
                      {zone.notes}
                    </p>
                  )}
                </div>
              </div>
            </TableCell>

            <TableCell>
              <p className="text-foreground">{t(`shapes.${zone.type}`)}</p>
              <p className="text-xs tabular-nums text-foreground-2">
                {zone.type === "circle" && zone.radiusMeters != null
                  ? t("radius", { value: number(zone.radiusMeters / 1852) })
                  : t("points", { count: zone.points?.length ?? 0 })}
                {!!zone.holes?.length &&
                  ` · ${t("holes", { count: zone.holes.length })}`}
              </p>
            </TableCell>

            <TableCell>
              <p className="tabular-nums text-foreground">
                {t("altitudeRange", {
                  floor: number(zone.floorFt),
                  ceiling: number(zone.ceilingFt),
                })}
              </p>
              <p className="text-xs text-foreground-2">
                {zone.ceilingReference}
              </p>
            </TableCell>

            <TableCell>
              <p className="tabular-nums text-foreground">
                {t("lateralBuffer", {
                  value: number(zone.lateralWarningBufferNm),
                })}
              </p>
              <p className="text-xs tabular-nums text-foreground-2">
                {t("altitudeMargin", {
                  value: number(zone.altitudeWarningMarginFt),
                })}
              </p>
            </TableCell>

            <TableCell className="text-foreground">
              {appliesTo(zone.appliesTo)}
            </TableCell>

            <TableCell>
              <ZoneStatusBadge active={zone.active} />
            </TableCell>

            <TableCell>
              <p className="text-foreground">{zone.lastEditedBy}</p>
              <p className="text-xs tabular-nums text-foreground-2">
                {format.dateTime(new Date(zone.lastEditedAt), DATE_TIME_FORMAT)}
              </p>
            </TableCell>

            <TableCell className="w-12 pe-4 text-end">
              <ZoneMenu zone={zone} name={name} />
            </TableCell>
          </TableRow>
        );
      })}
    </HoursTable>
  );
}
