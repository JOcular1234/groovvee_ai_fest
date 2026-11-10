import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Speaker photos come from admin-entered https URLs or local /public paths.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
