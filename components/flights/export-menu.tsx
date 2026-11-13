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

/**
 * A full browser request, not a client-side navigation: the route answers
 * with `Content-Disposition: attachment`, so the file downloads and the page
 * stays put.
 */
function download(format: "csv" | "pdf") {
  // It's an API route, not a page, so the router can't handle it.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/api/flights/export/${format}`);
}

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
        <DropdownMenuItem
          className={itemClassName}
          onClick={() => download("csv")}
        >
          {t("csv")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={itemClassName}
          onClick={() => download("pdf")}
        >
          {t("pdf")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
