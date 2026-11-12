import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
});

export type AppLocale = (typeof routing.locales)[number];

const RTL_LOCALES: ReadonlySet<AppLocale> = new Set(["ar"]);

export function getDirection(locale: AppLocale) {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}
