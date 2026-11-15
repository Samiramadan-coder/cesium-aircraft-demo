import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    serverActions: {
      // Aircraft photos are sent through a server action (default limit 1 MB);
      // keep in step with MAX_PHOTO_BYTES in lib/validations/aircraft.ts.
      bodySizeLimit: "6mb",
    },
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
