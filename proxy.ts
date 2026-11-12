import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import {
  AUTH_COOKIE_NAME,
  SESSION_EXPIRED,
  SESSION_PARAM,
} from "./lib/api/auth-cookie";
import {
  CALLBACK_URL_PARAM,
  HOME_PATH,
  PATHNAME_HEADER,
  SIGN_IN_PATH,
  isGuestOnlyRoute,
  isProtectedRoute,
  localizePath,
  safeCallbackUrl,
  splitLocale,
} from "./lib/auth-routes";
import { routing } from "./i18n/routing";

// Detects the locale and redirects to a locale-prefixed URL (/en, /ar).
const intlMiddleware = createMiddleware(routing);

const OVERRIDE_HEADERS = "x-middleware-override-headers";
const REQUEST_HEADER_PREFIX = "x-middleware-request-";

// Adds a request header for the server without dropping the ones next-intl
// already forwards (it overrides request headers via NextResponse.next/rewrite)
function forwardRequestHeader(
  request: NextRequest,
  response: NextResponse,
  name: string,
  value: string,
) {
  const existing = response.headers.get(OVERRIDE_HEADERS);
  const names = existing
    ? existing.split(",").map((header) => header.trim())
    : // No override yet: an override list replaces all request headers,
      // so carry over the original ones
      [...request.headers.keys()].map((header) => {
        response.headers.set(
          `${REQUEST_HEADER_PREFIX}${header}`,
          request.headers.get(header) ?? "",
        );
        return header;
      });

  if (!names.includes(name)) names.push(name);
  response.headers.set(OVERRIDE_HEADERS, names.join(","));
  response.headers.set(`${REQUEST_HEADER_PREFIX}${name}`, value);
}

export default function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const sessionExpired =
    nextUrl.searchParams.get(SESSION_PARAM) === SESSION_EXPIRED;
  // Only checks that the cookie exists; the API decides if it's still valid
  const isSignedIn =
    !sessionExpired && Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  let response = intlMiddleware(request);
  const isRedirect = response.headers.has("location");

  // Let next-intl's own redirects (e.g. adding the locale prefix) run first;
  // past this point the URL's locale is the final one
  if (!isRedirect) {
    const { locale } = splitLocale(nextUrl.pathname);

    if (!isSignedIn && isProtectedRoute(nextUrl.pathname)) {
      const callbackSearch = new URLSearchParams(nextUrl.search);
      callbackSearch.delete(SESSION_PARAM);
      const query = callbackSearch.toString();

      const url = new URL(localizePath(SIGN_IN_PATH, locale), request.url);
      url.searchParams.set(
        CALLBACK_URL_PARAM,
        `${nextUrl.pathname}${query ? `?${query}` : ""}`,
      );
      response = NextResponse.redirect(url);
    } else if (isSignedIn && isGuestOnlyRoute(nextUrl.pathname)) {
      const target = safeCallbackUrl(
        nextUrl.searchParams.get(CALLBACK_URL_PARAM),
        localizePath(HOME_PATH, locale),
      );
      response = NextResponse.redirect(new URL(target, request.url));
    } else {
      // Always overwritten, so clients can't spoof it
      forwardRequestHeader(
        request,
        response,
        PATHNAME_HEADER,
        `${nextUrl.pathname}${nextUrl.search}`,
      );
    }
  }

  if (sessionExpired) response.cookies.delete(AUTH_COOKIE_NAME);

  return response;
}

export const config = {
  // Everything except API routes, Next.js internals and files with an
  // extension (public/cesium, public/models, icons, ...).
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
