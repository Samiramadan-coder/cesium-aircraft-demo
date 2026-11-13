"use client";

import { useState } from "react";
import AircraftCard from "./aircraft-card";
import { useTranslations } from "next-intl";
import AircraftSheet from "./aircraft-sheet";
import { toMaintenanceAircraft } from "../maintainance/options";
import type { TrackedPilot } from "@/types/tracking";
import type { FleetAircraft } from "@/types/engine-flight-hours";

export default function DataPreview({
  aircraft,
  pilots,
}: {
  aircraft: FleetAircraft[];
  pilots: TrackedPilot[];
}) {
  const t = useTranslations("EngineHours");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = aircraft.find((item) => item.aircraftId === selectedId);

  if (aircraft.length === 0) {
    return (
      <p className="rounded-xl bg-card p-8 text-center text-sm text-foreground-2 ring-1 ring-foreground/10">
        {t("emptyFleet")}
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {aircraft.map((item) => (
          <AircraftCard
            key={item.aircraftId}
            aircraft={item}
            onViewDetails={() => setSelectedId(item.aircraftId)}
          />
        ))}
      </div>

      <AircraftSheet
        aircraft={selected ?? null}
        pilots={pilots}
        maintenanceAircraft={toMaintenanceAircraft(
          aircraft,
          aircraft.flatMap((item) => (item.profile ? [item.profile] : [])),
        )}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
