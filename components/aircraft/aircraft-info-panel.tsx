import { Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Aircraft } from "@/lib/aircraft/types";

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const utcTime = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "UTC",
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[0.65rem] font-medium tracking-widest text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="font-mono text-sm tabular-nums">{value}</dd>
    </div>
  );
}

type AircraftInfoPanelProps = {
  /** Every aircraft currently tracked, for the selector. */
  aircraftList: Aircraft[];
  /** The selected aircraft, or null while none is selected. */
  aircraft: Aircraft | null;
  paused: boolean;
  onSelectAircraft: (id: string) => void;
};

export function AircraftInfoPanel({
  aircraftList,
  aircraft,
  paused,
  onSelectAircraft,
}: AircraftInfoPanelProps) {
  const position = aircraft?.currentPosition ?? null;
  const name = aircraft ? (aircraft.callsign ?? aircraft.name) : "No aircraft";
  const description = aircraft
    ? aircraft.name
    : aircraftList.length > 0
      ? "Select an aircraft"
      : "Waiting for tracking data";
  const status = !position ? "Acquiring" : paused ? "Paused" : "Live";

  return (
    <Card
      size="sm"
      className="w-72 bg-card/80 shadow-xl backdrop-blur-md supports-backdrop-filter:bg-card/70"
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 font-mono tracking-wide">
            <Plane className="size-4 text-sky-400" />
            {name}
          </CardTitle>
          <Badge variant="outline" className="gap-1.5">
            <span
              className={
                status === "Live"
                  ? "size-1.5 rounded-full bg-emerald-400"
                  : "size-1.5 rounded-full bg-amber-400"
              }
            />
            {status}
          </Badge>
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
        {aircraftList.length > 1 && (
          <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto pt-1">
            {aircraftList.map(({ id, name, callsign }) => (
              <Button
                key={id}
                size="xs"
                variant={id === aircraft?.id ? "default" : "outline"}
                aria-pressed={id === aircraft?.id}
                className="font-mono"
                onClick={() => onSelectAircraft(id)}
              >
                {callsign ?? name}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      <Separator />
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field
            label="Altitude"
            value={position ? `${integer.format(position.altitude)} ft` : "—"}
          />
          <Field
            label="Ground speed"
            value={position ? `${integer.format(position.speed)} kt` : "—"}
          />
          <Field
            label="Heading"
            value={
              position
                ? `${String(Math.round(position.heading) % 360).padStart(3, "0")}°`
                : "—"
            }
          />
          <Field
            label="Last update"
            value={
              position ? `${utcTime.format(position.timestamp)} UTC` : "—"
            }
          />
          <Field
            label="Latitude"
            value={position ? position.lat.toFixed(4) : "—"}
          />
          <Field
            label="Longitude"
            value={position ? position.lng.toFixed(4) : "—"}
          />
        </dl>
      </CardContent>
    </Card>
  );
}
