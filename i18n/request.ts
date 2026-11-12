import * as rootParams from "next/root-params";
import { hasLocale } from "next-intl";
import { unstable_rethrow } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { getLocaleFromRequest } from "@/lib/api/locale";
import { routing } from "./routing";

// The [locale] segment, read from the root layout's params. This replaces
// setRequestLocale() in layouts/pages and keeps static rendering working.
// `undefined` where root params aren't available yet (Route Handlers,
// Server Actions)
async function localeFromRootParams() {
  try {
    return await rootParams.locale();
  } catch (error) {
    unstable_rethrow(error);
    return undefined;
  }
}

export default getRequestConfig(async ({ locale: explicitLocale }) => {
  // An explicit locale, e.g. getTranslations({ locale }), wins
  const requested = explicitLocale ?? (await localeFromRootParams());
  // No locale from the URL means the request didn't go through a [locale]
  // route (e.g. /api Route Handlers): use the cookie or Accept-Language
  // instead of always falling back to the default locale.
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : ((await getLocaleFromRequest()) ?? routing.defaultLocale);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    // Tracking timestamps are shown in UTC, as is usual in aviation.
    timeZone: "UTC",
  };
});
