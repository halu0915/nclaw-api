/**
 * /v1/embeddings — OpenAI-compatible passthrough.
 *
 * Forwards to api.openai.com/v1/embeddings using server-side OPENAI_API_KEY.
 * Records usage so embeddings count toward the customer's tenant quota
 * the same way chat completions do.
 *
 * No streaming, no tool-calls — keeps it short on purpose (per
 * "concise code" guidance). Pricing for embeddings is not in MODEL_COSTS,
 * so we record tokens but bill at a fixed cheap rate handled in usage.ts
 * fallback (input:1 / output:0).
 */
import { NextRequest, NextResponse } from "next/server";
import { validateApiKeyOrSameOriginDemo } from "@/lib/auth";
import { recordUsage } from "@/lib/usage";
import { calculateCost } from "@/lib/pricing";
import { ensureDemoTenant } from "@/lib/tenant";
import { log, newRequestId } from "@/lib/log";

export const maxDuration = 60;

const OPENAI_URL = "https://api.openai.com/v1/embeddings";
const MAX_BODY_BYTES = 5_000_000; // 5MB — embedding inputs can be long

function stripPrefix(model: string): string {
  return model.replace(/^openai\//, "");
}

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const auth = await validateApiKeyOrSameOriginDemo(req);
  if (!auth.valid) {
    return NextResponse.json(
      { error: { message: auth.error, type: "authentication_error" } },
      { status: 401, headers: { "X-Request-Id": requestId } }
    );
  }
  const { apiKey } = auth;
  const start = Date.now();
  await ensureDemoTenant();

  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: { message: `body too large (max ${MAX_BODY_BYTES})`, type: "payload_too_large" } },
      { status: 413 }
    );
  }

  let body: { model?: string; input?: string | string[]; [k: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { message: "invalid json body", type: "invalid_request_error" } },
      { status: 400 }
    );
  }
  if (!body.model || !body.input) {
    return NextResponse.json(
      { error: { message: "model and input required", type: "invalid_request_error" } },
      { status: 400 }
    );
  }

  const upstreamKey = process.env.OPENAI_API_KEY;
  if (!upstreamKey) {
    log.error("embeddings.no_upstream_key", { request_id: requestId });
    return NextResponse.json(
      { error: { message: "embeddings provider not configured", type: "server_error" } },
      { status: 503 }
    );
  }

  const upstreamBody = { ...body, model: stripPrefix(body.model) };
  const upstream = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${upstreamKey}`,
    },
    body: JSON.stringify(upstreamBody),
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    log.warn("embeddings.upstream_fail", {
      request_id: requestId,
      status: upstream.status,
      body_tail: text.slice(0, 200),
    });
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": "application/json", "X-Request-Id": requestId },
    });
  }

  const json = JSON.parse(text) as {
    usage?: { prompt_tokens?: number; total_tokens?: number };
    data?: unknown[];
  };
  const inputTokens = json.usage?.prompt_tokens ?? 0;
  const cost = calculateCost(body.model, inputTokens, 0, apiKey.plan);

  await recordUsage({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    tenantId: apiKey.tenantId,
    apiKeyId: apiKey.id,
    departmentId: apiKey.departmentId ?? undefined,
    provider: "openai",
    model: body.model,
    inputTokens,
    outputTokens: 0,
    totalTokens: json.usage?.total_tokens ?? inputTokens,
    costUsd: cost.costUsd,
    billedNtd: cost.billedNtd,
    latencyMs: Date.now() - start,
    status: "success",
  });

  return NextResponse.json(json, { headers: { "X-Request-Id": requestId } });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
