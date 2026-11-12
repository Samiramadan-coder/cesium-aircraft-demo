import { z } from "zod";

export type LoginErrorKey =
  | "emailRequired"
  | "emailInvalid"
  | "passwordRequired";

/**
 * Takes a translator for `LoginPage.errors`, so error messages come out
 * already localized and can be rendered as-is.
 */
export function createLoginSchema(t: (key: LoginErrorKey) => string) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, t("emailRequired"))
      .pipe(z.email(t("emailInvalid"))),
    password: z.string().min(1, t("passwordRequired")),
  });
}

export type LoginValues = z.infer<ReturnType<typeof createLoginSchema>>;
