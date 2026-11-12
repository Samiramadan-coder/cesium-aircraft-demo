import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { getLocaleFromRequest } from "@/lib/api/locale";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  // No locale from the URL or setRequestLocale() means the request didn't go
  // through the proxy (e.g. /api Route Handlers): use the cookie or
  // Accept-Language instead of always falling back to the default locale.
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
