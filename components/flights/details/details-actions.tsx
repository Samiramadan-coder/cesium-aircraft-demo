"use client";

import { Download, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const buttonClassName =
  "border-border bg-card text-foreground hover:bg-card-2";

/** Print and Export KML, top right of the flight details page. */
export default function DetailsActions({ flightId }: { flightId: string }) {
  const t = useTranslations("Flights.details");

  const exportKml = () => {
    // A full request, not a client-side navigation: the route answers with
    // `Content-Disposition: attachment`, so the file downloads and the page
    // stays put. It's an API route, so the router can't handle it anyway.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/api/flights/${encodeURIComponent(flightId)}/kml`);
  };

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button
        type="button"
        variant="outline"
        className={buttonClassName}
        onClick={() => window.print()}
      >
        <Printer />
        {t("print")}
      </Button>
      <Button
        type="button"
        variant="outline"
        className={buttonClassName}
        onClick={exportKml}
      >
        <Download />
        {t("exportKml")}
      </Button>
    </div>
  );
}
