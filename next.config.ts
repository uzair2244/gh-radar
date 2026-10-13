import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The MongoDB driver is a native-ish dependency and must stay server-side.
  // Keeping the page dynamic means every request re-queries the database
  // instead of being statically prerendered at build time.
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
