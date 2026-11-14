import { ArrowLeft } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DATE_TIME_FORMAT, EMPTY } from "@/components/trackers/shared";
import type { TrackedZone } from "@/types/tracking";
import { ZoneStatusBadge, useLabel, useZoneName } from "./shared";

export function BackLink() {
  const t = useTranslations("Zones.details");
  return (
    <Link
      href="/zones"
      className="inline-flex items-center gap-1.5 text-sm text-foreground-2 hover:text-foreground"
    >
      <ArrowLeft className="size-4 rtl:rotate-180" />
      {t("back")}
    </Link>
  );
}

/** "← Back to zones", the zone's colour, name, status and type. */
export function ZoneHeader({ zone }: { zone: TrackedZone }) {
  const zoneName = useZoneName();
  const kind = useLabel("kinds");

  return (
    <div className="space-y-2">
      <BackLink />
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: zone.color }}
          aria-hidden
        />
        <h1 className="text-xl font-semibold text-foreground">
          {zoneName(zone)}
        </h1>
        <ZoneStatusBadge active={zone.active} />
      </div>
      <p className="text-sm text-foreground-2">{kind(zone.kind)}</p>
    </div>
  );
}

/** The zone's limits and history, beside the map. */
export function ZoneSidebar({ zone }: { zone: TrackedZone }) {
  const t = useTranslations("Zones");
  const format = useFormatter();
  const appliesTo = useLabel("appliesToValues");

  const number = (value: number) =>
    format.number(value, { maximumFractionDigits: 2 });

  const shape =
    zone.type === "circle" && zone.radiusMeters != null
      ? t("radius", { value: number(zone.radiusMeters / 1852) })
      : t("points", { count: zone.points?.length ?? 0 }) +
        (zone.holes?.length
          ? ` · ${t("holes", { count: zone.holes.length })}`
          : "");

  const rows = [
    { key: "shape", label: t("columns.shape"), value: `${t(`shapes.${zone.type}`)} · ${shape}` },
    {
      key: "altitude",
      label: t("columns.altitude"),
      value: `${t("altitudeRange", {
        floor: number(zone.floorFt),
        ceiling: number(zone.ceilingFt),
      })} ${zone.ceilingReference}`,
    },
    {
      key: "lateral",
      label: t("form.lateralWarningBufferNm"),
      value: t("lateralBuffer", { value: number(zone.lateralWarningBufferNm) }),
    },
    {
      key: "margin",
      label: t("form.altitudeWarningMarginFt"),
      value: t("altitudeMargin", {
        value: number(zone.altitudeWarningMarginFt),
      }),
    },
    { key: "appliesTo", label: t("columns.appliesTo"), value: appliesTo(zone.appliesTo) },
    {
      key: "lastEdited",
      label: t("columns.lastEdited"),
      value: `${zone.lastEditedBy} · ${format.dateTime(
        new Date(zone.lastEditedAt),
        DATE_TIME_FORMAT,
      )}`,
    },
  ];

  return (
    <aside className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:self-start">
      <dl className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.key} className="grid gap-0.5 py-2.5 first:pt-0">
            <dt className="text-xs text-foreground-2">{row.label}</dt>
            <dd className="text-sm tabular-nums text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-1">
        <p className="text-xs text-foreground-2">{t("form.notes")}</p>
        <p className="text-sm text-foreground">{zone.notes || EMPTY}</p>
      </div>
    </aside>
  );
}
