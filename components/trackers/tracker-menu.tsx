"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useState } from "react";
import TrackerSheet from "./tracker-sheet";
import DeleteTracker from "./delete-tracker";
import TrackerForm from "./tracker-form";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Tracker } from "@/types/trackers";
import type { TrackedAircraft } from "@/types/tracking";
import {
  Cable,
  Ellipsis,
  Pencil,
  Radio,
  Trash2,
  Unlink,
} from "lucide-react";

const itemClassName =
  "gap-2.5 px-2 py-1.5 focus:bg-card-2 focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground";

export default function TrackerMenu({
  tracker,
  aircraft,
}: {
  tracker: Tracker;
  aircraft: TrackedAircraft | null;
}) {
  const t = useTranslations("Trackers.menu");
  const [viewing, setViewing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("label", { device: tracker.imei })}
              className="text-foreground-2 hover:bg-card-2 hover:text-foreground data-popup-open:bg-card-2"
            />
          }
        >
          <Ellipsis />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-44 bg-card text-foreground ring-border"
        >
          <DropdownMenuItem
            className={itemClassName}
            onClick={() => setViewing(true)}
          >
            <Cable />
            {t("view")}
          </DropdownMenuItem>

          {/* TODO: wire up */}
          <DropdownMenuItem className={itemClassName}>
            <Radio />
            {t("ping")}
          </DropdownMenuItem>

          {/* TODO: wire up */}
          <DropdownMenuItem
            variant="destructive"
            disabled={!aircraft}
            className={itemClassName}
          >
            <Unlink />
            {t("unlink")}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className={itemClassName}
            onClick={() => setEditing(true)}
          >
            <Pencil />
            {t("edit")}
          </DropdownMenuItem>

          <DropdownMenuItem
            variant="destructive"
            className={itemClassName}
            onClick={() => setDeleting(true)}
          >
            <Trash2 />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TrackerForm
        trackerId={tracker.id}
        open={editing}
        onOpenChange={setEditing}
      />

      <DeleteTracker
        tracker={tracker}
        open={deleting}
        onOpenChange={setDeleting}
      />

      <TrackerSheet
        tracker={viewing ? tracker : null}
        aircraft={aircraft}
        onClose={() => setViewing(false)}
      />
    </>
  );
}
