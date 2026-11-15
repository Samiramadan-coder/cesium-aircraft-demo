import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/slugify";

export type PilotErrorKey =
  | "idRequired"
  | "idInvalid"
  | "nameRequired"
  | "initialsRequired"
  | "initialsInvalid"
  | "phoneInvalid";

/** Takes a translator for `Pilots.form.errors`. */
export function createPilotSchema(t: (key: PilotErrorKey) => string) {
  return z.object({
    id: z
      .string()
      .trim()
      .min(1, t("idRequired"))
      .regex(SLUG_PATTERN, t("idInvalid")),
    name: z.string().trim().min(1, t("nameRequired")),
    nameAr: z.string().trim(),
    initials: z
      .string()
      .trim()
      .min(1, t("initialsRequired"))
      .max(3, t("initialsInvalid")),
    /** Optional; "" is sent as null. */
    licenseNumber: z.string().trim(),
    phone: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^\+?[\d\s-]{7,20}$/.test(value),
        t("phoneInvalid"),
      ),
  });
}

export type PilotValues = z.infer<ReturnType<typeof createPilotSchema>>;
