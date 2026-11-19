import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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
