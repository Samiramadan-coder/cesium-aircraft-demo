import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  AircraftCell,
  BatteryLevel,
  EMPTY,
  SignalStrength,
  TrackerStatusBadge,
  compareVersions,
  toDate,
} from "./shared";
import TrackerMenu from "./tracker-menu";

import { cn } from "cn";
import type { FirmwareVersion, Tracker } from "@/types/trackers";
import type { TrackedAircraft } from "@/types/tracking";
import { useFormatter, useNow, useTranslations } from "next-intl";

const JUST_NOW_MS = 60_000;

export default function DataPreview({
  trackers: list,
  aircraft,
  firmwareVersions,
}: {
  trackers: Tracker[];
  aircraft: TrackedAircraft[];
  /** Latest release per model, from `/v1/firmware-versions`. */
  firmwareVersions: FirmwareVersion[];
}) {
  const t = useTranslations("Trackers");
  const format = useFormatter();
  const now = useNow();

  if (list.length === 0) {
    return (
      <p className="rounded-xl bg-card p-8 text-center text-sm text-foreground-2 ring-1 ring-foreground/10">
        {t("empty")}
      </p>
    );
  }

  const trackers = list.map((tracker) => ({
    ...tracker,
    aircraft:
      aircraft.find(
        (item) =>
          (tracker.aircraftId && item.id === tracker.aircraftId) ||
          item.trackerId === tracker.id,
      ) ?? null,
  }));

  // Aircraft no tracker is installed on — the choices for "Link to aircraft".
  const availableAircraft = aircraft.filter(
    (item) => !trackers.some((tracker) => tracker.aircraft?.id === item.id),
  );

  const models = firmwareVersions.map((item) => item.model);

  /** The tracker's own `firmwareLatest`, else the latest release for its model. */
  const latestFor = (tracker: Tracker) =>
    tracker.firmwareLatest ??
    firmwareVersions.find((item) => item.model === tracker.model)
      ?.latestVersion ??
    null;

  const lastSeen = (value: string | null) => {
    const date = toDate(value);
    if (!date) return null;
    return now.getTime() - date.getTime() < JUST_NOW_MS
      ? t("justNow")
      : format.relativeTime(date, now);
  };

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="ps-4 text-foreground">
              {t("device")}
            </TableHead>
            <TableHead className="text-foreground">{t("aircraft")}</TableHead>
            <TableHead className="text-foreground">{t("sim")}</TableHead>
            <TableHead className="text-foreground">{t("status")}</TableHead>
            <TableHead className="text-foreground">{t("signal")}</TableHead>
            <TableHead className="text-foreground">{t("battery")}</TableHead>
            <TableHead className="text-foreground">{t("firmware")}</TableHead>
            <TableHead className="w-12 pe-4">
              <span className="sr-only">{t("menu.column")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trackers.map((tracker) => {
            const seen =
              tracker.status === "notInstalled"
                ? null
                : lastSeen(tracker.lastSeenAt);
            const latest = latestFor(tracker);
            // Orange = older than the latest release for this model.
            const outdated =
              !!tracker.firmware &&
              !!latest &&
              compareVersions(tracker.firmware, latest) < 0;

            return (
              <TableRow
                key={tracker.id}
                className="border-border hover:bg-card-2/50"
              >
                <TableCell className="ps-4">
                  <p className="font-medium text-foreground">{tracker.model}</p>
                  <p className="text-xs tabular-nums text-foreground-2">
                    {tracker.imei}
                  </p>
                </TableCell>
                <TableCell>
                  <AircraftCell aircraft={tracker.aircraft} />
                </TableCell>
                <TableCell>
                  <p className="text-foreground">{tracker.sim ?? EMPTY}</p>
                  {tracker.simNumber && (
                    <p
                      dir="ltr"
                      className="text-start text-xs tabular-nums text-foreground-2"
                    >
                      {tracker.simNumber}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <TrackerStatusBadge status={tracker.status} />
                  {seen && (
                    <p className="mt-1 text-xs text-foreground-2">{seen}</p>
                  )}
                </TableCell>
                <TableCell>
                  <SignalStrength
                    value={
                      tracker.status === "online"
                        ? tracker.signalStrength
                        : null
                    }
                  />
                </TableCell>
                <TableCell>
                  <BatteryLevel value={tracker.batteryPercent} />
                </TableCell>
                <TableCell
                  className={cn(
                    "tabular-nums",
                    outdated ? "text-primary" : "text-foreground-2",
                  )}
                  title={
                    outdated && latest
                      ? t("firmwareOutdated", { version: latest })
                      : undefined
                  }
                >
                  {tracker.firmware ?? EMPTY}
                </TableCell>
                <TableCell className="pe-4 text-end">
                  <TrackerMenu
                    tracker={tracker}
                    aircraft={tracker.aircraft}
                    availableAircraft={availableAircraft}
                    models={models}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
