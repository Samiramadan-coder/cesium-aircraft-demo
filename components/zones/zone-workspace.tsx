"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Maximize, PencilRuler } from "lucide-react";
import { useTranslations } from "next-intl";
import { toFlightZone } from "@/lib/aircraft/live-tracking";
import { Button } from "@/components/ui/button";
import type { FlightZone } from "@/types/aircraft";
import type { TrackedZone } from "@/types/tracking";
import BoundaryEditor, { type BoundaryPreview } from "./boundary-editor";
import { ZoneSidebar } from "./zone-details";

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
  otherZones,
  googleMapsApiKey,
}: {
  zone: TrackedZone;
  otherZones: FlightZone[];
  googleMapsApiKey?: string;
}) {
  const t = useTranslations("Zones");
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<BoundaryPreview | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [mapFailed, setMapFailed] = useState(false);

  // The saved zone; a new object only when the server sends a new one.
  const saved = useMemo(() => toFlightZone(zone), [zone]);
  const shown = editing && preview ? preview.zone : saved;

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
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => setEditing(true)}
          >
            <PencilRuler />
            {t("boundaryEditor.open")}
          </Button>
          <ZoneSidebar zone={zone} />
        </div>
      )}
    </div>
  );
}
