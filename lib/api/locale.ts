import "server-only";

import { cookies, headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import type { Locale } from "next-intl";
import { hasLocale } from "next-intl";
import { getLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";

// Set by the next-intl middleware on every request it handles
const INTL_LOCALE_HEADER = "x-next-intl-locale";

const localeCookieName =
  typeof routing.localeCookie === "object" && routing.localeCookie.name
    ? routing.localeCookie.name
    : "NEXT_LOCALE";

// "ar-AE,ar;q=0.9,en;q=0.8" → best supported locale, matching the
// base language too ("ar-AE" → "ar")
function matchAcceptLanguage(value: string | null): Locale | undefined {
  if (!value) return undefined;

  const ranked = value
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((param) => param.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter(({ tag, q }) => tag && tag !== "*" && q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const match =
      routing.locales.find((locale) => locale.toLowerCase() === tag) ??
      routing.locales.find(
        (locale) => locale.toLowerCase() === tag.split("-")[0],
      );
    if (match) return match;
  }

  return undefined;
}

// What the request itself says about the locale: the next-intl middleware
// header → locale cookie → Accept-Language. `undefined` without a request
// scope (e.g. inside "use cache") or when nothing matches
export async function getLocaleFromRequest(): Promise<Locale | undefined> {
  try {
    const requestHeaders = await headers();

    const fromMiddleware = requestHeaders.get(INTL_LOCALE_HEADER);
    if (hasLocale(routing.locales, fromMiddleware)) return fromMiddleware;

    const fromCookie = (await cookies()).get(localeCookieName)?.value;
    if (hasLocale(routing.locales, fromCookie)) return fromCookie;

    const fromAcceptLanguage = matchAcceptLanguage(
      requestHeaders.get("accept-language"),
    );
    if (fromAcceptLanguage) return fromAcceptLanguage;
  } catch (error) {
    // No request scope (e.g. inside "use cache")
    unstable_rethrow(error);
  }

  return undefined;
}

// getLocale() is right wherever next-intl knows the locale (pages, and
// Server Actions, whose POST goes through the proxy). It can throw in
// Route Handlers and Server Actions, so fall back to what the request
// itself says. In this project, i18n/request.ts uses the same fallback
// instead of silently returning the default locale outside the proxy
// (e.g. /api Route Handlers)
export async function resolveLocale(): Promise<Locale> {
  try {
    return await getLocale();
  } catch (error) {
    unstable_rethrow(error);
  }

  return (await getLocaleFromRequest()) ?? routing.defaultLocale;
}
