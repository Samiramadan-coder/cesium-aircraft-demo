"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "cn";
import { getTracker } from "@/lib/actions/trackers";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tracker, TrackerDetails } from "@/types/trackers";
import type { TrackedAircraft } from "@/types/tracking";
import { ErrorNotice, Panel } from "./feedback";
import {
  BatteryLevel,
  DATE_TIME_FORMAT,
  EMPTY,
  SignalStrength,
  TrackerStatusBadge,
  aircraftLabel,
  toDate,
  useOptionLabel,
} from "./shared";
import TrackerHealthTab from "./tracker-health";
import { useLoad } from "@/hooks/use-load";

const TABS = ["overview", "liveStatus", "configuration", "health"] as const;

/** Side sheet with a tracker's details, opened by the row menu's "View". */
export default function TrackerSheet({
  tracker,
  aircraft,
  onClose,
}: {
  tracker: Tracker | null;
  aircraft: TrackedAircraft | null;
  onClose: () => void;
}) {
  const t = useTranslations("Trackers.details");

  // Keep showing the last tracker while the sheet animates closed.
  const [shown, setShown] = useState(tracker);
  if (tracker && tracker !== shown) setShown(tracker);

  const { state, retry } = useLoad(tracker?.id ?? null, getTracker);

  return (
    <Sheet open={!!tracker} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto border-border bg-card text-foreground data-[side=right]:w-full data-[side=right]:sm:max-w-xl *:data-[slot=sheet-close]:text-foreground-2">
        {shown && (
          <>
            <SheetHeader className="items-start gap-1.5 p-4 pe-12">
              <TrackerStatusBadge
                status={
                  state.status === "ready" ? state.data.status : shown.status
                }
              />
              <SheetTitle className="text-lg font-semibold">
                {shown.model}
              </SheetTitle>
              <SheetDescription className="font-mono text-sm tabular-nums text-foreground-2">
                {shown.imei}
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="overview" className="gap-4 px-4 pb-4">
              <div className="-mx-4 overflow-x-auto px-4 scrollbar-none">
                <TabsList className="w-max min-w-full bg-card-2/60 ring-1 ring-border">
                  {TABS.map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="px-2.5 text-muted hover:text-foreground data-active:bg-card data-active:text-foreground"
                    >
                      {t(`tabs.${tab}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {state.status === "loading" && <DetailsSkeleton />}

              {state.status === "error" && (
                <ErrorNotice message={state.message} onRetry={retry} />
              )}

              {state.status === "ready" && (
                <>
                  <TabsContent value="overview">
                    <Overview details={state.data} aircraft={aircraft} />
                  </TabsContent>
                  <TabsContent value="liveStatus">
                    <LiveStatus details={state.data} />
                  </TabsContent>
                  <TabsContent value="configuration">
                    <Configuration details={state.data} />
                  </TabsContent>
                  <TabsContent value="health">
                    <TrackerHealthTab
                      trackerId={state.data.id}
                      events={state.data.connectionEvents ?? []}
                    />
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

/** A label/value row; `null`, `false` and `""` values show as "—". */
function Row({
  label,
  value,
  note,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  mono?: boolean;
}) {
  const missing = value == null || value === false || value === "";

  return (
    <Panel className="flex items-center justify-between gap-4">
      <span className="text-sm text-foreground-2">{label}</span>
      <span className="min-w-0 text-end">
        <span
          dir={mono ? "ltr" : undefined}
          className={cn(
            "block font-semibold",
            mono && "font-mono tabular-nums",
          )}
        >
          {missing ? EMPTY : value}
        </span>
        {note && (
          <span className="block text-xs text-foreground-2">{note}</span>
        )}
      </span>
    </Panel>
  );
}

/** "•••• 3894" — only the last four digits are shown. */
function maskNumber(value: string) {
  return `•••• ${value.replace(/\D/g, "").slice(-4)}`;
}

function Overview({
  details,
  aircraft,
}: {
  details: TrackerDetails;
  aircraft: TrackedAircraft | null;
}) {
  const t = useTranslations("Trackers.details.overview");
  const format = useFormatter();
  const installedAt = toDate(details.installedAt);

  return (
    <div className="space-y-2">
      <Row label={t("model")} value={details.model} />
      <Row label={t("imei")} value={details.imei} mono />
      <Row label={t("serial")} value={details.serial} mono />
      <Row
        label={t("firmware")}
        value={details.firmware}
        mono
        note={
          details.firmwareLatest &&
          t("latestAvailable", { version: details.firmwareLatest })
        }
      />
      <Row
        label={t("linkedAircraft")}
        value={aircraft ? aircraftLabel(aircraft) : t("noAircraft")}
      />
      <Row
        label={t("installed")}
        value={installedAt && format.dateTime(installedAt, DATE_TIME_FORMAT)}
        note={
          details.installedBy && t("installedBy", { name: details.installedBy })
        }
      />
      <Row label={t("sim")} value={details.sim} />
      <Row
        label={t("simNumber")}
        value={details.simNumber && maskNumber(details.simNumber)}
        mono
      />
      <Row label={t("apn")} value={details.apn} mono />
    </div>
  );
}

function LiveStatus({ details }: { details: TrackerDetails }) {
  const t = useTranslations("Trackers.details.liveStatus");
  const powerLabel = useOptionLabel("powerSources");
  const format = useFormatter();

  const oneDecimal = (value: number) =>
    format.number(value, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Panel className="space-y-1.5">
          <p className="text-sm text-foreground-2">{t("signal")}</p>
          <SignalStrength value={details.signalStrength} />
        </Panel>
        <Panel className="space-y-1.5">
          <p className="text-sm text-foreground-2">{t("battery")}</p>
          <BatteryLevel value={details.batteryPercent} />
        </Panel>
      </div>

      <Row
        label={t("powerVoltage")}
        value={
          details.powerVoltage != null &&
          t("volts", { value: oneDecimal(details.powerVoltage) })
        }
        note={details.powerSource && powerLabel(details.powerSource)}
      />
      <Row
        label={t("engineState")}
        value={
          details.engineOn != null &&
          (details.engineOn ? t("running") : t("off"))
        }
      />
      <Row
        label={t("lastPosition")}
        value={
          details.lastPosition &&
          `${details.lastPosition.lat.toFixed(4)}, ${details.lastPosition.lon.toFixed(4)}`
        }
        mono
      />
      <Row
        label={t("gpsSatellites")}
        value={
          details.gpsSatellites != null && format.number(details.gpsSatellites)
        }
      />
      <Row
        label={t("gpsAccuracy")}
        value={
          details.gpsAccuracyM != null &&
          t("meters", { value: oneDecimal(details.gpsAccuracyM) })
        }
      />
    </div>
  );
}

function Configuration({ details }: { details: TrackerDetails }) {
  const t = useTranslations("Trackers.details.configuration");
  const engineLabel = useOptionLabel("engineInputs");
  const format = useFormatter();

  const unit = (value: number | null, key: "seconds" | "degrees" | "meters") =>
    value != null && t(key, { value: format.number(value) });

  return (
    <div className="space-y-2">
      <Row label={t("serverHost")} value={details.serverAddress} mono />
      <Row
        label={t("serverPort")}
        value={details.serverPort != null && String(details.serverPort)}
        mono
      />
      <Row
        label={t("intervalInFlight")}
        value={unit(details.reportingIntervalFlightSec, "seconds")}
      />
      <Row
        label={t("intervalOnGround")}
        value={unit(details.reportingIntervalGroundSec, "seconds")}
      />
      <Row
        label={t("angleTrigger")}
        value={unit(details.angleTriggerDeg, "degrees")}
      />
      <Row
        label={t("distanceTrigger")}
        value={unit(details.distanceTriggerM, "meters")}
      />
      <Row
        label={t("engineInput")}
        value={details.engineInput && engineLabel(details.engineInput)}
      />
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 9 }, (_, i) => (
        <Skeleton key={i} className="h-12 bg-card-2" />
      ))}
    </div>
  );
}
