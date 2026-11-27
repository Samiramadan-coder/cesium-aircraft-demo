import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Security headers on every response. The CSP only sets directives that
// cannot break Cesium (workers, wasm, Google/ion tiles) or Next's inline
// scripts: frame-ancestors stops clickjacking, the rest block <base>,
// plugin and cross-site form injection.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value:
      "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Sends only the origin cross-site, which is what the Google key's
  // HTTP referrer restriction checks.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    serverActions: {
      // Aircraft photos and 3D models are sent through server actions
      // (default limit 1 MB); keep in step with MAX_PHOTO_BYTES and
      // MAX_MODEL_BYTES in lib/validations/aircraft.ts.
      bodySizeLimit: "21mb",
    },
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
