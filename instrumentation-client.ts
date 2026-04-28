import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.VERCEL_ENV || "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
    tracesSampleRate: 0.1,
    // 不要送 cookies/PII
    sendDefaultPii: false,
  });
}
