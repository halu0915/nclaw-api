import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { log } from "@/lib/log";

const STARTED_AT = Date.now();
const VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev";

type CheckStatus = "ok" | "degraded" | "fail";
type Check = { status: CheckStatus; latency_ms?: number; error?: string };

async function checkDb(): Promise<Check> {
  const t0 = Date.now();
  try {
    await query("SELECT 1");
    return { status: "ok", latency_ms: Date.now() - t0 };
  } catch (e) {
    return {
      status: "fail",
      latency_ms: Date.now() - t0,
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

function checkProviderEnv(): Record<string, CheckStatus> {
  return {
    openai: process.env.OPENAI_API_KEY ? "ok" : "fail",
    anthropic: process.env.ANTHROPIC_API_KEY ? "ok" : "fail",
    deepseek: process.env.DEEPSEEK_API_KEY ? "ok" : "fail",
    google: process.env.GOOGLE_API_KEY ? "ok" : "fail",
    volcengine: process.env.VOLCENGINE_API_KEY ? "ok" : "fail",
  };
}

function checkStripeConfig(): CheckStatus {
  return process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET ? "ok" : "fail";
}

export async function GET() {
  const t0 = Date.now();
  const [db] = await Promise.all([checkDb()]);
  const providers = checkProviderEnv();
  const stripe = checkStripeConfig();

  const allProvidersOk = Object.values(providers).every((s) => s === "ok");
  const overall: CheckStatus =
    db.status === "fail" ? "fail"
    : !allProvidersOk || stripe !== "ok" ? "degraded"
    : "ok";

  const body = {
    status: overall,
    timestamp: new Date().toISOString(),
    uptime_sec: Math.floor((Date.now() - STARTED_AT) / 1000),
    version: VERSION,
    checks: {
      db,
      stripe,
      providers,
    },
    response_latency_ms: Date.now() - t0,
  };

  log.info("health.check", { overall, db_status: db.status, latency_ms: body.response_latency_ms });

  return NextResponse.json(body, {
    status: overall === "fail" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
