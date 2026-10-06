import { Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AircraftPosition } from "@/lib/aircraft/types";

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
  name: string;
  description: string;
  position: AircraftPosition | null;
  paused: boolean;
};

export function AircraftInfoPanel({
  name,
  description,
  position,
  paused,
}: AircraftInfoPanelProps) {
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
