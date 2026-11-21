import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Static CSP (no nonces): pages are prerendered/cached with cacheComponents,
// so per-request nonces aren't possible — Next's inline bootstrap scripts
// need 'unsafe-inline'. Everything else is locked to this origin. Remote
// https images are loaded directly by the browser (see components/ui/AppImage).
// Dev adds 'unsafe-eval' (React debugging) and ws: (HMR).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HSTS only in production — browsers ignore it over plain http anyway,
  // and pinning localhost to https breaks other local projects.
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // No remotePatterns on purpose: /_next/image only optimizes local
    // /public images, so it can't be used as an open image proxy. Remote
    // admin-entered https images render unoptimized via AppImage.
    remotePatterns: [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    agentFeedback: true,
    // Fewer build workers → fewer simultaneous DB connections during
    // prerendering. Each worker opens its own pg pool; on high-latency
    // links (satellite/cellular) 7+ workers firing at once self-DDoSes.
    staticGenerationMaxConcurrency: 4,
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
