"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useLoad } from "@/hooks/use-load";
import { getAircraftHours } from "@/lib/actions/engine-hours";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AircraftHoursDetails,
  FleetAircraft,
  FlightLogEntry,
  MaintenanceAircraftOption,
  NextService,
} from "@/types/engine-flight-hours";
import type { TrackedPilot } from "@/types/tracking";
import {
  AircraftAvatar,
  ComplianceBadge,
  Panel,
  ServiceProgress,
  StatusBadge,
  useFlightType,
  useHours,
  useServiceType,
} from "../shared";
import UtilizationChart from "./utilization-chart";
import LogMaintenance from "../maintenance/log-maintenance";

const TABS = ["overview", "maintenance", "flightLog"] as const;

export default function AircraftSheet({
  aircraft,
  pilots,
  maintenanceAircraft,
  onClose,
}: {
  aircraft: FleetAircraft | null;
  pilots: TrackedPilot[];
  maintenanceAircraft: MaintenanceAircraftOption[];
  onClose: () => void;
}) {
  const t = useTranslations("EngineHours.details");

  // Keep showing the last aircraft while the sheet animates closed.
  const [shown, setShown] = useState(aircraft);
  if (aircraft && aircraft !== shown) setShown(aircraft);

  // Ignores a late response for a previously opened aircraft.
  const { state: details, retry } = useLoad(
    aircraft?.aircraftId ?? null,
    getAircraftHours,
  );

  return (
    <Sheet open={!!aircraft} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto border-border bg-card text-foreground sm:max-w-md *:data-[slot=sheet-close]:text-foreground-2">
        {shown && (
          <>
            <SheetHeader className="flex-row items-center gap-3 p-4 pe-12">
              <AircraftAvatar profile={shown.profile} />
              <div className="min-w-0">
                <SheetTitle className="truncate text-lg font-semibold">
                  {shown.profile?.registration ?? shown.aircraftId}
                </SheetTitle>
                {shown.profile?.name && (
                  <SheetDescription className="truncate text-foreground-2">
                    {shown.profile.name}
                  </SheetDescription>
                )}
              </div>
            </SheetHeader>

            <Tabs defaultValue="overview" className="gap-4 px-4 pb-4">
              <TabsList className="w-full bg-card-2/60 ring-1 ring-border">
                {TABS.map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="text-muted hover:text-foreground data-active:bg-card data-active:text-foreground"
                  >
                    {t(`tabs.${tab}`)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {details.status === "loading" && <DetailsSkeleton />}

              {details.status === "error" && (
                <div
                  role="alert"
                  className="space-y-3 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
                >
                  <p>{details.message}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-border bg-card text-foreground hover:bg-card-2"
                    onClick={retry}
                  >
                    {t("retry")}
                  </Button>
                </div>
              )}

              {details.status === "ready" && (
                <>
                  <TabsContent value="overview">
                    <Overview
                      details={details.data}
                      maintenanceAircraft={maintenanceAircraft}
                      onLogged={retry}
                    />
                  </TabsContent>
                  <TabsContent value="maintenance">
                    <Maintenance details={details.data} />
                  </TabsContent>
                  <TabsContent value="flightLog">
                    <FlightLog flights={details.data.flightLog} pilots={pilots} />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Overview({
  details,
  maintenanceAircraft,
  onLogged,
}: {
  details: AircraftHoursDetails;
  maintenanceAircraft: MaintenanceAircraftOption[];
  onLogged: () => void;
}) {
  const t = useTranslations("EngineHours");
  const format = useFormatter();
  const hours = useHours();
  const { overview, utilization } = details;

  const stats = [
    { key: "lifetimeHours", value: hours(overview.lifetimeHours) },
    { key: "periodFlightHours", value: hours(overview.periodFlightHours) },
    { key: "periodEngineHours", value: hours(overview.periodEngineHours) },
    { key: "periodFlights", value: format.number(overview.flights) },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <Panel key={stat.key}>
            <p className="text-xs text-foreground-2">
              {t(`details.stats.${stat.key}`)}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{stat.value}</p>
          </Panel>
        ))}
      </div>

      <Panel className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-foreground-2">{t("details.serviceSchedule")}</p>
          <StatusBadge status={overview.status} />
        </div>
        <ServiceProgress
          service={overview.nextService}
          label={t("details.nextServiceDue")}
        />
      </Panel>

      <div className="space-y-2">
        <p className="text-sm text-foreground-2">
          {t("details.utilizationTitle", { days: utilization.length })}
        </p>
        <UtilizationChart data={utilization} />
      </div>

      <LogMaintenance
        aircraft={maintenanceAircraft}
        defaultAircraftId={details.aircraftId}
        onLogged={onLogged}
        trigger={
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full border-border bg-card-2/40 text-foreground hover:bg-card-2"
          >
            {t("logMaintenance")}
          </Button>
        }
      />
    </div>
  );
}

function Maintenance({ details }: { details: AircraftHoursDetails }) {
  const t = useTranslations("EngineHours.details");

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h4 className="text-sm text-foreground-2">{t("schedule")}</h4>
        {details.schedule.length === 0 ? (
          <Panel className="text-sm text-muted">{t("noScheduleItems")}</Panel>
        ) : (
          details.schedule.map((service) => (
            <ScheduleItem key={service.type} service={service} />
          ))
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-sm text-foreground-2">{t("history")}</h4>
        {/* TODO: render the entries once the API returns some. */}
        <Panel className="text-sm text-muted">
          {details.maintenanceHistory.length === 0
            ? t("noHistory")
            : t("historyCount", { count: details.maintenanceHistory.length })}
        </Panel>
      </section>
    </div>
  );
}

function ScheduleItem({ service }: { service: NextService }) {
  const t = useTranslations("EngineHours.details");
  const format = useFormatter();
  const serviceType = useServiceType();

  return (
    <Panel className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{serviceType(service.type)}</p>
        <StatusBadge status={service.status} />
      </div>
      <ServiceProgress
        service={service}
        label={t("lastService", {
          date: service.lastServiceDate
            ? format.dateTime(new Date(service.lastServiceDate), {
                dateStyle: "medium",
              })
            : t("never"),
        })}
      />
    </Panel>
  );
}

function FlightLog({
  flights,
  pilots,
}: {
  flights: FlightLogEntry[];
  pilots: TrackedPilot[];
}) {
  const t = useTranslations("EngineHours.details");
  const format = useFormatter();
  const flightType = useFlightType();

  if (flights.length === 0) {
    return <Panel className="text-sm text-muted">{t("noFlights")}</Panel>;
  }

  const pilotName = (id: string | null) =>
    pilots.find((pilot) => pilot.id === id)?.name ?? t("unknownPilot");
  const minutes = (value: number) =>
    t("minutes", { value: format.number(value, { maximumFractionDigits: 1 }) });

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-foreground-2">{t("log.date")}</TableHead>
            <TableHead className="text-foreground-2">{t("log.pilot")}</TableHead>
            <TableHead className="text-end text-foreground-2">
              {t("log.flight")}
            </TableHead>
            <TableHead className="text-end text-foreground-2">
              {t("log.engine")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flights.map((flight) => (
            <TableRow
              key={flight.flightId}
              className="border-border hover:bg-card-2/50"
            >
              <TableCell>
                <p>
                  {format.dateTime(flight.takeoffTime, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-xs text-muted">
                  {flightType(flight.flightType)}
                </p>
              </TableCell>
              <TableCell className="max-w-28 truncate">
                <p className="truncate">{pilotName(flight.pilotId)}</p>
                {flight.compliance !== "compliant" && (
                  <div className="mt-0.5">
                    <ComplianceBadge compliance={flight.compliance} />
                  </div>
                )}
              </TableCell>
              <TableCell className="text-end tabular-nums">
                {minutes(flight.flightTimeMin)}
              </TableCell>
              <TableCell className="text-end tabular-nums">
                {minutes(flight.engineTimeMin)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-17 bg-card-2" />
        ))}
      </div>
      <Skeleton className="h-24 bg-card-2" />
      <Skeleton className="h-40 bg-card-2" />
    </div>
  );
}
