"use client";

import { useState } from "react";
import { Eye, History, RotateCcw } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "cn";
import { restoreZoneVersion } from "@/lib/actions/zones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/trackers/confirm-dialog";
import { richTags } from "@/components/trackers/feedback";
import { DATE_TIME_FORMAT } from "@/components/trackers/shared";
import type { ZoneSnapshot, ZoneVersion } from "@/types/tracking";

/** What a version can change, and the snapshot fields behind each. */
const CHANGE_GROUPS = {
  boundary: ["type", "points", "holes", "center", "radiusMeters"],
  altitude: ["floorFt", "ceilingFt", "ceilingReference"],
  warnings: ["lateralWarningBufferNm", "altitudeWarningMarginFt"],
  name: ["name", "nameAr"],
  kind: ["kind"],
  color: ["color"],
  status: ["active"],
  appliesTo: ["appliesTo"],
  notes: ["notes"],
} as const satisfies Record<string, readonly (keyof ZoneSnapshot)[]>;

type ChangeGroup = keyof typeof CHANGE_GROUPS;

/** The groups whose fields differ between two snapshots. */
function changedGroups(before: ZoneSnapshot, after: ZoneSnapshot) {
  return (Object.keys(CHANGE_GROUPS) as ChangeGroup[]).filter((group) =>
    CHANGE_GROUPS[group].some(
      (field) =>
        JSON.stringify(before[field] ?? null) !==
        JSON.stringify(after[field] ?? null),
    ),
  );
}

/** Newest first. */
export function sortVersions(versions: ZoneVersion[]) {
  return [...versions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

/**
 * The zone's versions, newest first, each with who saved it, when, why and
 * what changed. "View on map" previews that version's boundary.
 */
export default function ZoneHistory({
  zoneId,
  versions,
  viewing,
  onView,
}: {
  zoneId: string;
  /** Newest first. */
  versions: ZoneVersion[];
  /** The version shown on the map, if not the current one. */
  viewing: string | null;
  onView: (versionId: string | null) => void;
}) {
  const t = useTranslations("Zones.history");
  const format = useFormatter();
  /** The version waiting for "Restore" to be confirmed. */
  const [restoring, setRestoring] = useState<ZoneVersion | null>(null);

  const formatDate = (version: ZoneVersion) =>
    format.dateTime(new Date(version.date), DATE_TIME_FORMAT);

  // Takes the version as an argument: reading `restoring.id` inside the
  // handler lets the React Compiler hoist it into render, where it's null.
  async function restore(version: ZoneVersion) {
    const result = await restoreZoneVersion(zoneId, version.id);
    // The restored boundary is now the current one.
    if (result.ok) onView(null);
    return result;
  }

  return (
    <section className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="flex items-center gap-2 font-semibold text-foreground">
        <History className="size-4 text-foreground-2" />
        {t("title")}
        <span className="text-sm font-normal text-foreground-2 tabular-nums">
          ({format.number(versions.length)})
        </span>
      </h2>

      {versions.length === 0 ? (
        <p className="text-sm text-foreground-2">{t("empty")}</p>
      ) : (
        <ol className="relative space-y-4 border-s border-border ps-4">
          {versions.map((version, i) => {
            const current = i === 0;
            const previous = versions[i + 1];
            const changes = previous
              ? changedGroups(previous.snapshot, version.snapshot)
              : null;
            const shown = current ? viewing === null : viewing === version.id;

            return (
              <li key={version.id} className="relative space-y-1.5">
                <span
                  aria-hidden
                  className={cn(
                    "absolute -start-[1.3rem] top-1.5 size-2.5 rounded-full ring-4 ring-card",
                    current ? "bg-primary" : "bg-card-2",
                  )}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {version.summary || t("noSummary")}
                  </p>
                  {current && (
                    <Badge
                      variant="outline"
                      className="border-primary/40 bg-primary/10 text-primary"
                    >
                      {t("current")}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-foreground-2">
                  {version.user}
                  {" · "}
                  <time dateTime={version.date} className="tabular-nums">
                    {formatDate(version)}
                  </time>
                </p>

                <div className="flex flex-wrap gap-1">
                  {changes === null ? (
                    <Badge variant="outline" className="border-border text-foreground-2">
                      {t("initial")}
                    </Badge>
                  ) : changes.length === 0 ? (
                    <Badge variant="outline" className="border-border text-foreground-2">
                      {t("noChanges")}
                    </Badge>
                  ) : (
                    changes.map((group) => (
                      <Badge
                        key={group}
                        variant="outline"
                        className="border-border bg-card-2/40 text-foreground"
                      >
                        {t(`changes.${group}`)}
                      </Badge>
                    ))
                  )}
                </div>

                <div className="-ms-2 flex flex-wrap gap-1">
                  {!shown && (
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      className="text-foreground-2 hover:bg-card-2 hover:text-foreground"
                      onClick={() => onView(current ? null : version.id)}
                    >
                      <Eye />
                      {t(current ? "viewCurrent" : "viewOnMap")}
                    </Button>
                  )}
                  {!current && (
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      className="text-foreground-2 hover:bg-card-2 hover:text-foreground"
                      onClick={() => setRestoring(version)}
                    >
                      <RotateCcw />
                      {t("restore")}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <ConfirmDialog
        open={restoring !== null}
        onOpenChange={(open) => {
          if (!open) setRestoring(null);
        }}
        title={t("restoreDialog.title")}
        description={
          restoring &&
          t.rich("restoreDialog.description", {
            summary: restoring.summary || t("noSummary"),
            date: formatDate(restoring),
            ...richTags,
          })
        }
        confirmLabel={t("restoreDialog.confirm")}
        onConfirm={() => restore(restoring as ZoneVersion)}
      />
    </section>
  );
}
