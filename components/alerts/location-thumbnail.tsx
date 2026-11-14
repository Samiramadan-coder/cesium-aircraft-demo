import { cn } from "cn";
import type { AlertSeverity } from "@/types/alerts";
import type { LatLon, TrackedZone } from "@/types/tracking";

const SIZE = 40;
const PADDING = 6;
/** Smallest span framed, so a lone point (no zone) isn't blown up. */
const MIN_SPAN_DEG = 0.02;
const CIRCLE_SEGMENTS = 32;

const TONES: Record<AlertSeverity, string> = {
  info: "text-foreground-2",
  warning: "text-primary",
  critical: "text-danger",
};

/** The zone's outline, or a ring of points around a circle zone. */
function zoneOutline(zone: TrackedZone | undefined): LatLon[] {
  if (!zone) return [];
  if (zone.points?.length) return zone.points;
  if (zone.center && zone.radiusMeters) {
    const { center, radiusMeters } = zone;
    const dLat = radiusMeters / 111_320;
    const dLon = dLat / Math.cos((center.lat * Math.PI) / 180);
    return Array.from({ length: CIRCLE_SEGMENTS }, (_, i) => {
      const angle = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
      return {
        lat: center.lat + dLat * Math.sin(angle),
        lon: center.lon + dLon * Math.cos(angle),
      };
    });
  }
  return [];
}

/** Projects lat/lon onto a SIZE×SIZE box framing all the points. */
function project(points: LatLon[]) {
  const meanLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  // A degree of longitude shrinks towards the poles.
  const lonScale = Math.cos((meanLat * Math.PI) / 180);

  const xs = points.map((p) => p.lon * lonScale);
  const ys = points.map((p) => p.lat);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY;

  const inner = SIZE - PADDING * 2;
  const scale = inner / Math.max(spanX, spanY, MIN_SPAN_DEG);
  // Centre both axes.
  const offsetX = PADDING + (inner - spanX * scale) / 2;
  const offsetY = PADDING + (inner - spanY * scale) / 2;

  return xs.map((x, i) => ({
    x: offsetX + (x - minX) * scale,
    // SVG's y axis points down, latitude points up.
    y: SIZE - (offsetY + (ys[i] - minY) * scale),
  }));
}

/** The alert's zone with a dot where it triggered. */
export default function LocationThumbnail({
  point,
  zone,
  severity,
  label,
}: {
  point: LatLon;
  zone: TrackedZone | undefined;
  severity: AlertSeverity;
  label: string;
}) {
  const projected = project([...zoneOutline(zone), point]);
  const shape = projected.slice(0, -1);
  const dot = projected[projected.length - 1];

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={label}
      className={cn(
        "size-14 shrink-0 rounded-lg bg-card-2/60 ring-1 ring-foreground/10",
        TONES[severity] ?? TONES.warning,
      )}
    >
      {shape.length > 2 && (
        <polygon
          points={shape.map((p) => `${p.x},${p.y}`).join(" ")}
          strokeWidth={0.75}
          strokeLinejoin="round"
          className="fill-foreground/5 stroke-foreground/30"
        />
      )}
      <circle cx={dot.x} cy={dot.y} r={3.5} fill="currentColor" opacity={0.25} />
      <circle cx={dot.x} cy={dot.y} r={1.8} fill="currentColor" />
    </svg>
  );
}
