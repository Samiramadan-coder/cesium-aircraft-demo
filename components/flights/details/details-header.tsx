import { ArrowLeft } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import {
  ComplianceBadge,
  useFlightType,
} from "@/components/engine-flight-hours/shared";
import { Link } from "@/i18n/navigation";
import type { Flight } from "@/types/flights";
import DetailsActions from "./details-actions";

/** "← Back", the flight's title and compliance, its date and type, actions. */
export default function DetailsHeader({ flight }: { flight: Flight }) {
  const t = useTranslations("Flights.details");
  const format = useFormatter();
  const flightType = useFlightType();

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        <BackLink />
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold text-foreground">
            {t("title", { id: flight.id.toUpperCase() })}
          </h1>
          <ComplianceBadge compliance={flight.compliance} />
        </div>
        <p className="text-sm text-foreground-2">
          {format.dateTime(flight.engineStartTime, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
          {" · "}
          {flightType(flight.flightType)}
        </p>
      </div>

      <DetailsActions flightId={flight.id} />
    </div>
  );
}

export function BackLink() {
  const t = useTranslations("Flights.details");
  return (
    <Link
      href="/flights"
      className="inline-flex items-center gap-1.5 text-sm text-foreground-2 hover:text-foreground print:hidden"
    >
      <ArrowLeft className="size-4 rtl:rotate-180" />
      {t("back")}
    </Link>
  );
}
