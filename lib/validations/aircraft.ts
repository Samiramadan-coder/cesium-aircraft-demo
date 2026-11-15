import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/slugify";

export type AircraftErrorKey =
  | "idRequired"
  | "idInvalid"
  | "registrationRequired"
  | "nameRequired"
  | "typeRequired"
  | "colorInvalid"
  | "intervalInvalid"
  | "photoType"
  | "photoSize";

/** Keep in step with `serverActions.bodySizeLimit` in next.config.ts. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Takes a translator for `Aircrafts.form.errors`. */
export function createAircraftSchema(t: (key: AircraftErrorKey) => string) {
  return z.object({
    id: z
      .string()
      .trim()
      .min(1, t("idRequired"))
      .regex(SLUG_PATTERN, t("idInvalid")),
    registration: z.string().trim().min(1, t("registrationRequired")),
    name: z.string().trim().min(1, t("nameRequired")),
    nameAr: z.string().trim(),
    type: z.string().min(1, t("typeRequired")),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, t("colorInvalid")),
    /** NO_PILOT when unassigned */
    pilotId: z.string(),
    serviceIntervalHours: z
      .number({ error: t("intervalInvalid") })
      .int(t("intervalInvalid"))
      .positive(t("intervalInvalid")),
    /** A new photo to upload after saving; null keeps the current one. */
    photo: z
      .custom<File | null>()
      .refine(
        (file) =>
          !file || (PHOTO_TYPES as readonly string[]).includes(file.type),
        t("photoType"),
      )
      .refine((file) => !file || file.size <= MAX_PHOTO_BYTES, t("photoSize")),
  });
}

export type AircraftValues = z.infer<ReturnType<typeof createAircraftSchema>>;
