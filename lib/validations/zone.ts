import { z } from "zod";

export type ZoneErrorKey =
  | "nameRequired"
  | "colorInvalid"
  | "numberRequired"
  | "latInvalid"
  | "lonInvalid"
  | "pointsMin"
  | "radiusInvalid"
  | "ceilingBelowFloor"
  | "negative"
  | "summaryRequired";

/** Takes a translator for `Zones.form.errors`. */
export function createZoneSchema(t: (key: ZoneErrorKey) => string) {
  const number = () => z.number({ error: t("numberRequired") });
  const nonNegative = () => number().min(0, t("negative"));
  const point = z.object({
    lat: number().min(-90, t("latInvalid")).max(90, t("latInvalid")),
    lon: number().min(-180, t("lonInvalid")).max(180, t("lonInvalid")),
  });

  return z
    .object({
      name: z.string().trim().min(1, t("nameRequired")),
      nameAr: z.string().trim(),
      kind: z.string().min(1),
      type: z.enum(["polygon", "circle"]),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/, t("colorInvalid")),
      points: z.array(point),
      center: point,
      radiusMeters: number(),
      floorFt: nonNegative(),
      ceilingFt: nonNegative(),
      ceilingReference: z.string().min(1),
      lateralWarningBufferNm: nonNegative(),
      altitudeWarningMarginFt: nonNegative(),
      active: z.boolean(),
      notes: z.string().trim(),
      summary: z.string().trim().min(1, t("summaryRequired")),
    })
    .superRefine((values, ctx) => {
      if (values.type === "polygon" && values.points.length < 3) {
        ctx.addIssue({ code: "custom", path: ["points"], message: t("pointsMin") });
      }
      if (values.type === "circle" && !(values.radiusMeters > 0)) {
        ctx.addIssue({
          code: "custom",
          path: ["radiusMeters"],
          message: t("radiusInvalid"),
        });
      }
      if (values.ceilingFt <= values.floorFt) {
        ctx.addIssue({
          code: "custom",
          path: ["ceilingFt"],
          message: t("ceilingBelowFloor"),
        });
      }
    });
}

export type ZoneValues = z.infer<ReturnType<typeof createZoneSchema>>;
