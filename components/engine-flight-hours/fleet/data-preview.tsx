"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { TrackedPilot } from "@/types/tracking";
import type {
  FleetAircraft,
  MaintenanceAircraftOption,
} from "@/types/engine-flight-hours";
import { EmptyState } from "../shared";
import AircraftCard from "./aircraft-card";
import AircraftSheet from "./aircraft-sheet";

export default function DataPreview({
  aircraft,
  pilots,
  maintenanceAircraft,
}: {
  aircraft: FleetAircraft[];
  pilots: TrackedPilot[];
  maintenanceAircraft: MaintenanceAircraftOption[];
}) {
  const t = useTranslations("EngineHours");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = aircraft.find((item) => item.aircraftId === selectedId);

  if (aircraft.length === 0) return <EmptyState>{t("emptyFleet")}</EmptyState>;

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
        maintenanceAircraft={maintenanceAircraft}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
