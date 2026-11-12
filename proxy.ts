import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Detects the locale and redirects to a locale-prefixed URL (/en, /ar).
export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next.js internals and files with an
  // extension (public/cesium, public/models, icons, ...).
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
