import type { FieldPath } from "react-hook-form";
import type { ZoneValues } from "@/lib/validations/zone";
import type { TrackedZone, ZonePayload } from "@/types/tracking";

export const ZONE_KINDS = ["trainingArea", "atz"] as const;
export const CEILING_REFERENCES = ["AMSL", "AGL"] as const;

/** Falcon Airport; the starting centre for a new circle or point. */
export const AIRPORT = { lat: 24.466203, lon: 55.624922 };

export const DEFAULT_VALUES: ZoneValues = {
  name: "",
  nameAr: "",
  kind: ZONE_KINDS[0],
  type: "polygon",
  color: "#4A9EDB",
  points: [],
  center: AIRPORT,
  radiusMeters: 5556,
  floorFt: 0,
  ceilingFt: 2000,
  ceilingReference: CEILING_REFERENCES[0],
  lateralWarningBufferNm: 0.5,
  altitudeWarningMarginFt: 200,
  active: true,
  notes: "",
  summary: "",
};

/** Form values from a saved zone; anything missing falls back to the defaults. */
export function toValues(zone: TrackedZone): ZoneValues {
  return {
    name: zone.name,
    nameAr: zone.nameAr ?? "",
    kind: zone.kind,
    type: zone.type,
    color: zone.color,
    points: zone.points ?? [],
    center: zone.center ?? AIRPORT,
    radiusMeters: zone.radiusMeters ?? DEFAULT_VALUES.radiusMeters,
    floorFt: zone.floorFt,
    ceilingFt: zone.ceilingFt,
    ceilingReference: zone.ceilingReference,
    lateralWarningBufferNm: zone.lateralWarningBufferNm,
    altitudeWarningMarginFt: zone.altitudeWarningMarginFt,
    active: zone.active,
    notes: zone.notes ?? "",
    // Describes this edit in the version history; written each time.
    summary: "",
  };
}

/** Only the shape fields of the chosen type are sent. */
export function toPayload(values: ZoneValues, zone?: TrackedZone): ZonePayload {
  const { points, center, radiusMeters, ...rest } = values;
  return {
    ...rest,
    nameAr: values.nameAr || null,
    notes: values.notes || null,
    // Not editable here yet; keep what the zone already has.
    appliesTo: zone?.appliesTo ?? "all",
    ...(values.type === "polygon"
      ? { points, ...(zone?.holes?.length && { holes: zone.holes }) }
      : { center, radiusMeters }),
  };
}

/**
 * Every form path a server error can land on. Laravel names point errors
 * "points.0.lat", the same paths as the form.
 */
export function zoneFieldPaths(values: ZoneValues): FieldPath<ZoneValues>[] {
  return [
    ...(Object.keys(DEFAULT_VALUES) as FieldPath<ZoneValues>[]),
    ...values.points.flatMap((_, i) => [
      `points.${i}.lat` as const,
      `points.${i}.lon` as const,
    ]),
    "center.lat",
    "center.lon",
  ];
}

/** Fields the map page's boundary editor shows. */
export const BOUNDARY_FIELDS: readonly string[] = [
  "type",
  "points",
  "center",
  "radiusMeters",
  "summary",
];
