import { cn } from "cn";
import type { Compliance } from "@/types/engine-flight-hours";
import type { LatLon } from "@/types/tracking";

const SIZE = 40;
const PADDING = 6;

const TONES: Record<Compliance, string> = {
  compliant: "text-success",
  warnings: "text-primary",
  violation: "text-danger",
};

/** Projects lat/lon onto a SIZE×SIZE box, keeping the route's aspect ratio. */
function project(route: LatLon[]) {
  const meanLat =
    route.reduce((sum, point) => sum + point.lat, 0) / route.length;
  // A degree of longitude shrinks towards the poles.
  const lonScale = Math.cos((meanLat * Math.PI) / 180);

  const xs = route.map((point) => point.lon * lonScale);
  const ys = route.map((point) => point.lat);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY;

  const inner = SIZE - PADDING * 2;
  const scale = inner / (Math.max(spanX, spanY) || 1);
  // Centre the shorter axis.
  const offsetX = PADDING + (inner - spanX * scale) / 2;
  const offsetY = PADDING + (inner - spanY * scale) / 2;

  return xs.map((x, i) => ({
    x: offsetX + (x - minX) * scale,
    // SVG's y axis points down, latitude points up.
    y: SIZE - (offsetY + (ys[i] - minY) * scale),
  }));
}

export default function RouteThumbnail({
  route,
  compliance,
  label,
}: {
  route: LatLon[];
  compliance: Compliance;
  label: string;
}) {
  const points = route.length > 0 ? project(route) : [];
  const start = points[0];
  const end = points.at(-1);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={label}
      className={cn(
        "size-14 shrink-0 rounded-lg bg-card-2/60 ring-1 ring-foreground/10",
        TONES[compliance] ?? TONES.compliant,
      )}
    >
      <rect
        x={3}
        y={3}
        width={SIZE - 6}
        height={SIZE - 6}
        rx={3}
        fill="none"
        strokeDasharray="1.5 1.5"
        strokeWidth={0.5}
        className="stroke-foreground/20"
      />
      {points.length > 1 && (
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {start && <circle cx={start.x} cy={start.y} r={1.6} fill="currentColor" />}
      {end && points.length > 1 && (
        <circle cx={end.x} cy={end.y} r={1.6} fill="currentColor" />
      )}
    </svg>
  );
}
