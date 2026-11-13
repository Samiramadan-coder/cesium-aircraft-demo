"use client";

import { useState } from "react";
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
import { useTranslations } from "next-intl";
import { deleteTracker, unlinkTracker } from "@/lib/actions/trackers";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Tracker } from "@/types/trackers";
import type { TrackedAircraft } from "@/types/tracking";
import CheckFirmware from "./check-firmware";
import ConfirmDialog from "./confirm-dialog";
import { richTags } from "./feedback";
import LinkTracker from "./link-tracker";
import PingTracker from "./ping-tracker";
import { aircraftLabel } from "./shared";
import TrackerForm from "./tracker-form";
import TrackerSheet from "./tracker-sheet";

const itemClassName =
  "gap-2.5 px-2 py-1.5 focus:bg-card-2 focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground";

/** What the menu has opened; only one at a time. */
type Opened =
  "view" | "ping" | "firmware" | "link" | "unlink" | "edit" | "delete";

/** The row's "⋯" menu and the sheet/dialogs it opens. */
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
  const t = useTranslations("Trackers");
  const [opened, setOpened] = useState<Opened | null>(null);

  /** `open`/`onOpenChange` props for the dialog that `key` opens. */
  const dialog = (key: Opened) => ({
    open: opened === key,
    onOpenChange: (open: boolean) => setOpened(open ? key : null),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("menu.label", { device: tracker.imei })}
              className="text-foreground-2 hover:bg-card-2 hover:text-foreground data-popup-open:bg-card-2"
            />
          }
        >
          <Ellipsis />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-48 bg-card text-foreground ring-border"
        >
          <DropdownMenuItem
            className={itemClassName}
            onClick={() => setOpened("view")}
          >
            <Cable />
            {t("menu.view")}
          </DropdownMenuItem>

          <DropdownMenuItem
            className={itemClassName}
            disabled={tracker.status === "notInstalled"}
            onClick={() => setOpened("ping")}
          >
            <Radio />
            {t("menu.ping")}
          </DropdownMenuItem>

          <DropdownMenuItem
            className={itemClassName}
            onClick={() => setOpened("firmware")}
          >
            <CircuitBoard />
            {t("menu.checkFirmware")}
          </DropdownMenuItem>

          {aircraft ? (
            <DropdownMenuItem
              variant="destructive"
              className={itemClassName}
              onClick={() => setOpened("unlink")}
            >
              <Unlink />
              {t("menu.unlink")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className={itemClassName}
              onClick={() => setOpened("link")}
            >
              <Link2 />
              {t("menu.link")}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className={itemClassName}
            onClick={() => setOpened("edit")}
          >
            <Pencil />
            {t("menu.edit")}
          </DropdownMenuItem>

          <DropdownMenuItem
            variant="destructive"
            className={itemClassName}
            onClick={() => setOpened("delete")}
          >
            <Trash2 />
            {t("menu.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TrackerSheet
        tracker={opened === "view" ? tracker : null}
        aircraft={aircraft}
        onClose={() => setOpened(null)}
      />

      <PingTracker tracker={tracker} {...dialog("ping")} />

      <CheckFirmware tracker={tracker} {...dialog("firmware")} />

      <LinkTracker
        tracker={tracker}
        aircraft={availableAircraft}
        {...dialog("link")}
      />

      {aircraft && (
        <ConfirmDialog
          {...dialog("unlink")}
          title={t("unlinkDialog.title")}
          description={t.rich("unlinkDialog.description", {
            device: tracker.model,
            imei: tracker.imei,
            aircraft: aircraftLabel(aircraft),
            ...richTags,
          })}
          confirmLabel={t("unlinkDialog.confirm")}
          onConfirm={() => unlinkTracker(tracker.id)}
        />
      )}

      <TrackerForm trackerId={tracker.id} models={models} {...dialog("edit")} />

      <ConfirmDialog
        {...dialog("delete")}
        title={t("deleteDialog.title")}
        description={t.rich("deleteDialog.description", {
          device: tracker.model,
          imei: tracker.imei,
          ...richTags,
        })}
        confirmLabel={t("deleteDialog.confirm")}
        onConfirm={() => deleteTracker(tracker.id)}
      />
    </>
  );
}
