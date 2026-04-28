import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/v1/:path*",
        destination: "/api/v1/:path*",
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
