"use client";

import { Download, Ellipsis, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";

const itemClassName =
  "gap-2.5 px-2 py-1.5 focus:bg-card-2 focus:text-foreground";

/** The "…" actions for one flight row. */
export default function FlightMenu({ flightId }: { flightId: string }) {
  const t = useTranslations("Flights.table.menu");

  const exportKml = () => {
    // A full request, not a client-side navigation: the route answers with
    // `Content-Disposition: attachment`, so the file downloads and the page
    // stays put. It's an API route, so the router can't handle it anyway.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/api/flights/${encodeURIComponent(flightId)}/kml`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("label", { id: flightId })}
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
          render={<Link href={`/flights/${encodeURIComponent(flightId)}`} />}
        >
          <Eye />
          {t("view")}
        </DropdownMenuItem>

        <DropdownMenuItem className={itemClassName} onClick={exportKml}>
          <Download />
          {t("exportKml")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
