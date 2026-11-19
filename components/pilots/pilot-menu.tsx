"use client";

import { useState } from "react";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { deletePilot } from "@/lib/actions/pilots";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/components/auth/permissions-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/trackers/confirm-dialog";
import { richTags } from "@/components/trackers/feedback";
import type { TrackedPilot } from "@/types/tracking";
import PilotForm from "./pilot-form";

const itemClassName =
  "gap-2.5 px-2 py-1.5 focus:bg-card-2 focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground";

/** What the menu has opened; only one at a time. */
type Opened = "edit" | "delete";

/** The row's "⋯" menu and the dialogs it opens. */
export default function PilotMenu({
  pilot,
  name,
}: {
  pilot: TrackedPilot;
  /** The pilot's name in the current locale. */
  name: string;
}) {
  const t = useTranslations("Pilots");
  const [opened, setOpened] = useState<Opened | null>(null);
  const canManage = usePermission("manageFleet");

  /** `open`/`onOpenChange` props for the dialog that `key` opens. */
  const dialog = (key: Opened) => ({
    open: opened === key,
    onOpenChange: (open: boolean) => setOpened(open ? key : null),
  });

  // Every item edits the pilot
  if (!canManage) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("menu.label", { pilot: name })}
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

      <PilotForm pilot={pilot} {...dialog("edit")} />

      <ConfirmDialog
        {...dialog("delete")}
        title={t("deleteDialog.title")}
        description={t.rich("deleteDialog.description", {
          pilot: name,
          ...richTags,
        })}
        confirmLabel={t("deleteDialog.confirm")}
        onConfirm={() => deletePilot(pilot.id)}
      />
    </>
  );
}
