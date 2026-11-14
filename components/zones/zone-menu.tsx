"use client";

import { useState } from "react";
import { Ellipsis, Map as MapIcon, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { deleteZone } from "@/lib/actions/zones";
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
import type { TrackedZone } from "@/types/tracking";
import ZoneForm from "./zone-form";

const itemClassName =
  "gap-2.5 px-2 py-1.5 focus:bg-card-2 focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground";

/** What the menu has opened; only one at a time. */
type Opened = "edit" | "delete";

/** The row's "⋯" menu and the dialogs it opens. */
export default function ZoneMenu({
  zone,
  name,
}: {
  zone: TrackedZone;
  /** The zone's name in the current locale. */
  name: string;
}) {
  const t = useTranslations("Zones");
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
              aria-label={t("menu.label", { zone: name })}
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
            render={<Link href={`/zones/${encodeURIComponent(zone.id)}`} />}
          >
            <MapIcon />
            {t("menu.openMap")}
          </DropdownMenuItem>

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

      <ZoneForm zone={zone} {...dialog("edit")} />

      <ConfirmDialog
        {...dialog("delete")}
        title={t("deleteDialog.title")}
        description={t.rich("deleteDialog.description", {
          zone: name,
          ...richTags,
        })}
        confirmLabel={t("deleteDialog.confirm")}
        onConfirm={() => deleteZone(zone.id)}
      />
    </>
  );
}
