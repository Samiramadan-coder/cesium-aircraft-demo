"use client";

import { useState } from "react";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteAircraft } from "@/lib/actions/aircraft";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/trackers/confirm-dialog";
import { richTags } from "@/components/trackers/feedback";
import type { TrackedAircraft, TrackedPilot } from "@/types/tracking";
import AircraftForm from "./aircraft-form";

const itemClassName =
  "gap-2.5 px-2 py-1.5 focus:bg-card-2 focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground";

/** What the menu has opened; only one at a time. */
type Opened = "edit" | "delete";

/** The row's "⋯" menu and the dialogs it opens. */
export default function AircraftMenu({
  aircraft,
  pilots,
}: {
  aircraft: TrackedAircraft;
  pilots: TrackedPilot[];
}) {
  const t = useTranslations("Aircrafts");
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
              aria-label={t("menu.label", { aircraft: aircraft.registration })}
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
            onClick={() => setOpened("edit")}
          >
            <Pencil />
            {t("menu.edit")}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

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

      <AircraftForm aircraft={aircraft} pilots={pilots} {...dialog("edit")} />

      <ConfirmDialog
        {...dialog("delete")}
        title={t("deleteDialog.title")}
        description={t.rich("deleteDialog.description", {
          aircraft: `${aircraft.registration} · ${aircraft.name}`,
          ...richTags,
        })}
        confirmLabel={t("deleteDialog.confirm")}
        onConfirm={() => deleteAircraft(aircraft.id)}
      />
    </>
  );
}
