"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { cn } from "cn";
import { TrackerStatusBadge } from "./shared";
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

const TABS = [
  "overview",
  "liveStatus",
  "configuration",
  "health",
  "actions",
] as const;

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
                  {/* TODO: the remaining tabs, one at a time. */}
                  {TABS.filter((tab) => tab !== "overview").map((tab) => (
                    <TabsContent key={tab} value={tab}>
                      <Panel className="py-8 text-center text-sm text-muted">
                        {t("comingSoon")}
                      </Panel>
                    </TabsContent>
                  ))}
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

/**
 * Accepts epoch ms, epoch seconds or a date string; null when unparsable,
 * so the formatter never gets an invalid date.
 */
function toDate(value: number | string | null) {
  if (value == null || value === "") return null;
  const date =
    typeof value === "number"
      ? new Date(value < 1e12 ? value * 1000 : value)
      : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
          details.latestFirmware &&
          t("latestAvailable", { version: details.latestFirmware })
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

function DetailsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 9 }, (_, i) => (
        <Skeleton key={i} className="h-12 bg-card-2" />
      ))}
    </div>
  );
}
