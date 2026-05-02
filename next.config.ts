import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/v1/:path*",
        destination: "/api/v1/:path*",
      },
      // serve static product pages at clean URLs
      { source: "/pro", destination: "/pro/index.html" },
      { source: "/bot", destination: "/bot/index.html" },
    ];
  },
  async redirects() {
    return [
      // api.nplusstar.ai is API endpoint only — non-API routes redirect to nclaw.nplusstar.ai
      {
        source: "/pro",
        has: [{ type: "host", value: "api.nplusstar.ai" }],
        destination: "https://nclaw.nplusstar.ai/pro",
        permanent: true,
      },
      {
        source: "/bot",
        has: [{ type: "host", value: "api.nplusstar.ai" }],
        destination: "https://nclaw.nplusstar.ai/bot",
        permanent: true,
      },
      {
        source: "/chat",
        has: [{ type: "host", value: "api.nplusstar.ai" }],
        destination: "https://nclaw.nplusstar.ai/chat",
        permanent: true,
      },
      {
        source: "/download/:path*",
        has: [{ type: "host", value: "api.nplusstar.ai" }],
        destination: "https://nclaw.nplusstar.ai/download/:path*",
        permanent: true,
      },
      {
        source: "/login",
        has: [{ type: "host", value: "api.nplusstar.ai" }],
        destination: "https://nclaw.nplusstar.ai/login",
        permanent: true,
      },
      {
        source: "/register",
        has: [{ type: "host", value: "api.nplusstar.ai" }],
        destination: "https://nclaw.nplusstar.ai/register",
        permanent: true,
      },
      {
        source: "/dashboard",
        has: [{ type: "host", value: "api.nplusstar.ai" }],
        destination: "https://nclaw.nplusstar.ai/dashboard",
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // 沒設定 SENTRY_AUTH_TOKEN 時 wizard 會跳過 source map 上傳，不會擋 build
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT || "nclaw-api",
  // tunneling — 把 Sentry events 走自己 domain，繞過 ad blockers
  tunnelRoute: "/monitoring",
  // 自動 instrument 路徑
  widenClientFileUpload: true,
});
