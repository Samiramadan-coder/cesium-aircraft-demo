"use client";

import { useState } from "react";
import { CircleCheck, Ellipsis, Eye, UserPlus, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Alert } from "@/types/alerts";
import type { StaffMember } from "@/types/user";
import { AcknowledgeAlert, AssignAlert, ResolveAlert } from "./alert-dialogs";

const itemClassName =
  "gap-2.5 px-2 py-1.5 focus:bg-card-2 focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground";

/** What the menu has opened; only one dialog at a time. */
type Opened = "acknowledge" | "assign" | "resolve";

/** The row's "⋯" menu and the dialogs it opens. */
export default function AlertMenu({
  alert,
  staff,
  onView,
}: {
  alert: Alert;
  /** Staff offered by "Assign". */
  staff: StaffMember[];
  /** Opens the details sheet. */
  onView: () => void;
}) {
  const t = useTranslations("Alerts.menu");
  const [opened, setOpened] = useState<Opened | null>(null);

  /** `open`/`onOpenChange` props for the dialog that `key` opens. */
  const dialog = (key: Opened) => ({
    open: opened === key,
    onOpenChange: (open: boolean) => setOpened(open ? key : null),
  });

  const resolved = alert.status === "resolved";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("label", { id: alert.id })}
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
          <DropdownMenuItem className={itemClassName} onClick={onView}>
            <Eye />
            {t("view")}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className={itemClassName}
            disabled={alert.status !== "open"}
            onClick={() => setOpened("acknowledge")}
          >
            <Check />
            {t("acknowledge")}
          </DropdownMenuItem>

          <DropdownMenuItem
            className={itemClassName}
            disabled={resolved}
            onClick={() => setOpened("assign")}
          >
            <UserPlus />
            {t("assign")}
          </DropdownMenuItem>

          <DropdownMenuItem
            className={itemClassName}
            disabled={resolved}
            onClick={() => setOpened("resolve")}
          >
            <CircleCheck />
            {t("resolve")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AcknowledgeAlert alert={alert} {...dialog("acknowledge")} />
      <AssignAlert alert={alert} staff={staff} {...dialog("assign")} />
      <ResolveAlert alert={alert} {...dialog("resolve")} />
    </>
  );
}
