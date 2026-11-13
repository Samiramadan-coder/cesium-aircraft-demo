import { z } from "zod";

export const STAFF_ROLES = [
  "operations",
  "engineer",
  "viewer",
  "super_admin",
] as const;

export const STAFF_LOCALES = ["ar", "en"] as const;

const PASSWORD_MIN = 8;

export type StaffErrorKey =
  | "nameRequired"
  | "emailRequired"
  | "emailInvalid"
  | "passwordRequired"
  | "passwordTooShort";

/** Takes a translator for `Staff.addDialog.errors`. */
export function createStaffSchema(t: (key: StaffErrorKey) => string) {
  return z.object({
    name: z.string().trim().min(1, t("nameRequired")),
    email: z
      .string()
      .trim()
      .min(1, t("emailRequired"))
      .pipe(z.email(t("emailInvalid"))),
    password: z
      .string()
      .min(1, t("passwordRequired"))
      .min(PASSWORD_MIN, t("passwordTooShort")),
    role: z.enum(STAFF_ROLES),
    locale: z.enum(STAFF_LOCALES),
  });
}

export type StaffValues = z.infer<ReturnType<typeof createStaffSchema>>;
