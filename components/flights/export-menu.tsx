"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const itemClassName =
  "gap-2.5 px-2 py-1.5 focus:bg-card-2 focus:text-foreground";

/** Export dropdown — UI only for now; the items aren't wired to an export yet. */
export default function ExportMenu() {
  const t = useTranslations("Flights.export");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="border-border bg-card text-foreground hover:bg-card-2 data-popup-open:bg-card-2"
          />
        }
      >
        <Download />
        {t("button")}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-40 bg-card text-foreground ring-border"
      >
        <DropdownMenuItem className={itemClassName}>{t("csv")}</DropdownMenuItem>
        <DropdownMenuItem className={itemClassName}>{t("pdf")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
