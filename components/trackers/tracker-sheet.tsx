"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  BatteryLevel,
  SignalStrength,
  TrackerStatusBadge,
  toDate,
} from "./shared";

import { cn } from "cn";
import TrackerHealthTab from "./tracker-health";
import { Button } from "@/components/ui/button";
import { getTracker } from "@/lib/actions/trackers";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrackedAircraft } from "@/types/tracking";
import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { Tracker, TrackerDetails } from "@/types/trackers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DetailsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: TrackerDetails };

const TABS = ["overview", "liveStatus", "configuration", "health"] as const;

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

  const [details, setDetails] = useState<DetailsState>({ status: "loading" });
  const trackerId = tracker?.id;

  const load = useCallback(async (id: string) => {
    setDetails({ status: "loading" });
    const result = await getTracker(id);
    setDetails(
      result.ok
        ? { status: "ready", data: result.data }
        : { status: "error", message: result.message },
    );
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on open
    if (trackerId) load(trackerId);
  }, [trackerId, load]);

  return (
    <Sheet open={!!tracker} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto border-border bg-card text-foreground data-[side=right]:w-full data-[side=right]:sm:max-w-xl *:data-[slot=sheet-close]:text-foreground-2">
        {shown && (
          <>
            <SheetHeader className="items-start gap-1.5 p-4 pe-12">
              <TrackerStatusBadge
                status={
                  details.status === "ready"
                    ? details.data.status
                    : shown.status
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

              {details.status === "loading" && <DetailsSkeleton />}

              {details.status === "error" && (
                <div className="space-y-3 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
                  <p>{details.message}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border bg-card text-foreground hover:bg-card-2"
                    onClick={() => load(shown.id)}
                  >
                    {t("retry")}
                  </Button>
                </div>
              )}

              {details.status === "ready" && (
                <>
                  <TabsContent value="overview">
                    <Overview details={details.data} aircraft={aircraft} />
                  </TabsContent>
                  <TabsContent value="liveStatus">
                    <LiveStatus details={details.data} />
                  </TabsContent>
                  <TabsContent value="configuration">
                    <Configuration details={details.data} />
                  </TabsContent>
                  <TabsContent value="health">
                    <TrackerHealthTab
                      trackerId={details.data.id}
                      events={details.data.connectionEvents ?? []}
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

function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card-2/40 p-3",
        className,
      )}
      {...props}
    />
  );
}

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
          {value}
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
  const digits = value.replace(/\D/g, "");
  return `•••• ${digits.slice(-4)}`;
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
  const empty = "—";
  const installedAt = toDate(details.installedAt);

  return (
    <div className="space-y-2">
      <Row label={t("model")} value={details.model} />
      <Row label={t("imei")} value={details.imei} mono />
      <Row label={t("serial")} value={details.serial ?? empty} mono />
      <Row
        label={t("firmware")}
        value={details.firmware ?? empty}
        mono
        note={
          details.firmwareLatest &&
          t("latestAvailable", { version: details.firmwareLatest })
        }
      />
      <Row
        label={t("linkedAircraft")}
        value={
          aircraft
            ? `${aircraft.registration} — ${aircraft.name}`
            : t("noAircraft")
        }
      />
      <Row
        label={t("installed")}
        value={
          installedAt
            ? format.dateTime(installedAt, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : empty
        }
        note={
          details.installedBy && t("installedBy", { name: details.installedBy })
        }
      />
      <Row label={t("sim")} value={details.sim ?? empty} />
      <Row
        label={t("simNumber")}
        value={details.simNumber ? maskNumber(details.simNumber) : empty}
        mono
      />
      <Row label={t("apn")} value={details.apn ?? empty} mono />
    </div>
  );
}

function LiveStatus({ details }: { details: TrackerDetails }) {
  const t = useTranslations("Trackers.details.liveStatus");
  const tPower = useTranslations("Trackers.addDialog.powerSources");
  const format = useFormatter();
  const empty = "—";

  const decimal = (value: number, digits: number) =>
    format.number(value, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

  const powerSource = details.powerSource
    ? tPower.has(details.powerSource as "internal")
      ? tPower(details.powerSource as "internal")
      : details.powerSource
    : undefined;

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
          details.powerVoltage != null
            ? t("volts", { value: decimal(details.powerVoltage, 1) })
            : empty
        }
        note={powerSource}
      />
      <Row
        label={t("engineState")}
        value={
          details.engineOn == null
            ? empty
            : details.engineOn
              ? t("running")
              : t("off")
        }
      />
      <Row
        label={t("lastPosition")}
        value={
          details.lastPosition
            ? `${details.lastPosition.lat.toFixed(4)}, ${details.lastPosition.lon.toFixed(4)}`
            : empty
        }
        mono
      />
      <Row
        label={t("gpsSatellites")}
        value={
          details.gpsSatellites != null
            ? format.number(details.gpsSatellites)
            : empty
        }
      />
      <Row
        label={t("gpsAccuracy")}
        value={
          details.gpsAccuracyM != null
            ? t("meters", { value: decimal(details.gpsAccuracyM, 1) })
            : empty
        }
      />
    </div>
  );
}

function Configuration({ details }: { details: TrackerDetails }) {
  const t = useTranslations("Trackers.details.configuration");
  const tEngine = useTranslations("Trackers.addDialog.engineInputs");
  const format = useFormatter();
  const empty = "—";

  const num = (value: number | null, key: "seconds" | "degrees" | "meters") =>
    value != null ? t(key, { value: format.number(value) }) : empty;

  const engineInput = details.engineInput
    ? tEngine.has(details.engineInput as "motion")
      ? tEngine(details.engineInput as "motion")
      : details.engineInput
    : empty;

  return (
    <div className="space-y-2">
      <Row
        label={t("serverHost")}
        value={details.serverAddress ?? empty}
        mono
      />
      <Row
        label={t("serverPort")}
        value={details.serverPort != null ? String(details.serverPort) : empty}
        mono
      />
      <Row
        label={t("intervalInFlight")}
        value={num(details.reportingIntervalFlightSec, "seconds")}
      />
      <Row
        label={t("intervalOnGround")}
        value={num(details.reportingIntervalGroundSec, "seconds")}
      />
      <Row
        label={t("angleTrigger")}
        value={num(details.angleTriggerDeg, "degrees")}
      />
      <Row
        label={t("distanceTrigger")}
        value={num(details.distanceTriggerM, "meters")}
      />
      <Row label={t("engineInput")} value={engineInput} />
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
