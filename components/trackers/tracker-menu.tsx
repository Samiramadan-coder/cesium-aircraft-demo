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
import PingTracker from "./ping-tracker";
import CheckFirmware from "./check-firmware";
import LinkTracker from "./link-tracker";
import UnlinkTracker from "./unlink-tracker";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Tracker } from "@/types/trackers";
import type { TrackedAircraft } from "@/types/tracking";
import {
  Cable,
  CircuitBoard,
  Ellipsis,
  Link2,
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
  availableAircraft,
  models,
}: {
  tracker: Tracker;
  /** The aircraft this tracker is installed on. */
  aircraft: TrackedAircraft | null;
  /** Aircraft without a tracker, offered by "Link to aircraft". */
  availableAircraft: TrackedAircraft[];
  /** Tracker models offered by the edit form. */
  models: string[];
}) {
  const t = useTranslations("Trackers.menu");
  const [viewing, setViewing] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [checkingFirmware, setCheckingFirmware] = useState(false);
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

          <DropdownMenuItem
            className={itemClassName}
            disabled={tracker.status === "notInstalled"}
            onClick={() => setPinging(true)}
          >
            <Radio />
            {t("ping")}
          </DropdownMenuItem>

          <DropdownMenuItem
            className={itemClassName}
            onClick={() => setCheckingFirmware(true)}
          >
            <CircuitBoard />
            {t("checkFirmware")}
          </DropdownMenuItem>

          {aircraft ? (
            <DropdownMenuItem
              variant="destructive"
              className={itemClassName}
              onClick={() => setUnlinking(true)}
            >
              <Unlink />
              {t("unlink")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className={itemClassName}
              onClick={() => setLinking(true)}
            >
              <Link2 />
              {t("link")}
            </DropdownMenuItem>
          )}

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

      {aircraft && (
        <UnlinkTracker
          tracker={tracker}
          aircraft={aircraft}
          open={unlinking}
          onOpenChange={setUnlinking}
        />
      )}

      <LinkTracker
        tracker={tracker}
        aircraft={availableAircraft}
        open={linking}
        onOpenChange={setLinking}
      />

      <CheckFirmware
        tracker={tracker}
        open={checkingFirmware}
        onOpenChange={setCheckingFirmware}
      />

      <PingTracker tracker={tracker} open={pinging} onOpenChange={setPinging} />

      <TrackerForm
        trackerId={tracker.id}
        models={models}
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
