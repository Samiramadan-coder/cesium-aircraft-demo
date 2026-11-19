"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Maximize, PencilRuler, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toFlightZone } from "@/lib/aircraft/live-tracking";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/components/auth/permissions-provider";
import type { FlightZone } from "@/types/aircraft";
import type {
  TrackedZone,
  ZoneComputed,
  ZoneVersion,
} from "@/types/tracking";
import { DATE_TIME_FORMAT } from "@/components/trackers/shared";
import BoundaryEditor, { type BoundaryPreview } from "./boundary-editor";
import { ZoneSidebar } from "./zone-details";
import ZoneGeometry from "./zone-geometry";
import ZoneHistory, { sortVersions } from "./zone-history";

// Cesium only runs in the browser.
const ZoneMap = dynamic(() => import("./zone-map"), { ssr: false });

const overlayButtonClassName =
  "border-border bg-card/90 text-foreground backdrop-blur hover:bg-card-2";

/**
 * The zone's map beside its details. "Edit boundary" swaps the details for
 * the boundary editor, and the map follows the edits live.
 */
export default function ZoneWorkspace({
  zone,
  versions: versionList,
  computed,
  otherZones,
  googleMapsApiKey,
}: {
  zone: TrackedZone;
  /** From `/v1/tracking/zones/{zone}/versions`, any order. */
  versions: ZoneVersion[];
  /** Measurements of the saved zone; null if they couldn't load. */
  computed: ZoneComputed | null;
  otherZones: FlightZone[];
  googleMapsApiKey?: string;
}) {
  const t = useTranslations("Zones");
  const format = useFormatter();
  const [editing, setEditing] = useState(false);
  const canEdit = usePermission("manageOperations");
  /** An older version shown on the map instead of the current boundary. */
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<BoundaryPreview | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [mapFailed, setMapFailed] = useState(false);

  // The saved zone; a new object only when the server sends a new one.
  const saved = useMemo(() => toFlightZone(zone), [zone]);
  const versions = useMemo(() => sortVersions(versionList), [versionList]);
  const viewing = versions.find((version) => version.id === viewingId);
  const viewed = useMemo(
    () => (viewing ? toFlightZone({ ...zone, ...viewing.snapshot }) : null),
    [zone, viewing],
  );
  const shown = editing && preview ? preview.zone : (viewed ?? saved);

  function viewVersion(versionId: string | null) {
    setViewingId(versionId);
    // Fly to it: an old boundary may be somewhere else.
    setFrameKey((key) => key + 1);
  }

  const stopEditing = useCallback(() => {
    setEditing(false);
    setPreview(null);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="relative h-[60dvh] min-h-80 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 lg:h-[calc(100dvh-12rem)]">
        {mapFailed || !saved ? (
          <p className="flex h-full items-center justify-center p-4 text-center text-sm text-foreground-2">
            {t(mapFailed ? "details.mapUnavailable" : "details.noBoundary")}
          </p>
        ) : (
          <>
            <ZoneMap
              zone={shown}
              vertices={editing ? preview?.vertices : undefined}
              otherZones={otherZones}
              googleMapsApiKey={googleMapsApiKey}
              frameKey={frameKey}
              onError={() => setMapFailed(true)}
            />

            <div className="absolute top-3 flex gap-2 ltr:right-3 rtl:left-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={overlayButtonClassName}
                onClick={() => setFrameKey((key) => key + 1)}
              >
                <Maximize />
                {t("boundaryEditor.fit")}
              </Button>
            </div>

            {viewing && !editing && (
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-lg bg-card/90 px-3 py-2 text-xs text-foreground backdrop-blur">
                <span>
                  {t("history.viewingBanner", {
                    summary: viewing.summary,
                    date: format.dateTime(
                      new Date(viewing.date),
                      DATE_TIME_FORMAT,
                    ),
                  })}
                </span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className={overlayButtonClassName}
                  onClick={() => viewVersion(null)}
                >
                  <X />
                  {t("history.backToCurrent")}
                </Button>
              </div>
            )}

            {editing && !preview?.zone && (
              <p className="absolute inset-x-3 bottom-3 rounded-lg bg-card/90 px-3 py-2 text-center text-xs text-foreground-2 backdrop-blur">
                {t("boundaryEditor.incomplete")}
              </p>
            )}
          </>
        )}
      </div>

      {editing ? (
        <BoundaryEditor
          zone={zone}
          onPreview={setPreview}
          onDone={stopEditing}
        />
      ) : (
        <div className="space-y-4 lg:self-start">
          {canEdit && (
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => {
                setViewingId(null);
                setEditing(true);
              }}
            >
              <PencilRuler />
              {t("boundaryEditor.open")}
            </Button>
          )}
          <ZoneSidebar zone={zone} />
          <ZoneGeometry computed={computed} />
          <ZoneHistory
            zoneId={zone.id}
            versions={versions}
            viewing={viewingId}
            onView={viewVersion}
          />
        </div>
      )}
    </div>
  );
}
