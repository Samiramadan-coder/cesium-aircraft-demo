import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { FleetAircraft } from "@/types/engine-flight-hours";
import {
  AircraftAvatar,
  ServiceProgress,
  StatusBadge,
  useHours,
} from "./shared";

export default function AircraftCard({
  aircraft,
  onViewDetails,
}: {
  aircraft: FleetAircraft;
  onViewDetails: () => void;
}) {
  const t = useTranslations("EngineHours");
  const format = useFormatter();
  const hours = useHours();
  const { profile } = aircraft;

  const stats = [
    { key: "lifetime", value: hours(aircraft.lifetimeHours) },
    { key: "flightHrs", value: hours(aircraft.periodFlightHours) },
    { key: "flights", value: format.number(aircraft.flights) },
  ] as const;

  return (
    <article className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <header className="flex items-start gap-3">
        <AircraftAvatar profile={profile} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">
            {profile?.registration ?? aircraft.aircraftId}
          </h3>
          {profile?.name && (
            <p className="truncate text-sm text-foreground-2">{profile.name}</p>
          )}
        </div>
        <StatusBadge status={aircraft.status} />
      </header>

      <dl className="grid grid-cols-3 gap-2 rounded-lg bg-card-2 px-3 py-2.5">
        {stats.map((stat) => (
          <div key={stat.key} className="min-w-0">
            <dt className="truncate text-xs text-foreground-2">
              {t(`card.${stat.key}`)}
            </dt>
            <dd className="mt-0.5 font-semibold text-foreground tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <ServiceProgress
        service={aircraft.nextService}
        label={t("card.nextService")}
      />

      <Button
        variant="outline"
        className="mt-auto w-full border-border bg-card-2/40 text-foreground hover:bg-card-2"
        onClick={onViewDetails}
      >
        {t("card.viewDetails")}
      </Button>
    </article>
  );
}
