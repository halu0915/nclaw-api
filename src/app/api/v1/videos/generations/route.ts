import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth";
import { recordUsage } from "@/lib/usage";
import {
  beginIdempotency,
  finalizeIdempotency,
  abortIdempotency,
  hashRequest,
} from "@/lib/idempotency";
import { log, newRequestId } from "@/lib/log";

const VOLCENGINE_API_KEY = () => process.env.VOLCENGINE_API_KEY || "";
const VOLCENGINE_VIDEO_URL = "https://ark.cn-beijing.volces.com/api/v3/contents/generations";
const MAX_BODY_BYTES = 200_000; // 200KB（影片描述+image_url 不該超過）

const VIDEO_COST_RMB_PER_SEC: Record<string, number> = {
  "seedance-2.0": 1,
  "seedance-2.0-fast": 0.6,
};

const RMB_TO_NTD = 4.6;
const VIDEO_RETRY_FACTOR = 2;
const VIDEO_MARKUP = 2.5;

function calculateVideoBilledNtd(model: string, durationSec: number): { costNtd: number; billedNtd: number } {
  const rmbPerSec = VIDEO_COST_RMB_PER_SEC[model] || 1;
  const costNtd = durationSec * rmbPerSec * RMB_TO_NTD * VIDEO_RETRY_FACTOR;
  const billedNtd = Math.ceil(costNtd * VIDEO_MARKUP);
  return { costNtd, billedNtd };
}

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const auth = await validateApiKey(req);
  if (!auth.valid) {
    log.warn("video.auth_fail", { request_id: requestId, error: auth.error });
    return NextResponse.json(
      { error: { message: auth.error, type: "authentication_error" } },
      { status: 401, headers: { "X-Request-Id": requestId } }
    );
  }

  const { apiKey } = auth;
  const startTime = Date.now();

  // 請求大小防禦
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: { message: `Request body too large (max ${MAX_BODY_BYTES} bytes)`, type: "payload_too_large" } },
      { status: 413 }
    );
  }

  let idempotencyKey: string | null = null;
  let idempotencyActive = false;

  try {
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: { message: `Request body too large (max ${MAX_BODY_BYTES} bytes)`, type: "payload_too_large" } },
        { status: 413 }
      );
    }

    let body: { model?: string; prompt?: string; duration?: number; image_url?: string };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: { message: "Invalid JSON body", type: "invalid_request_error" } },
        { status: 400 }
      );
    }

    const model = body.model || "seedance-2.0";
    const prompt = body.prompt;
    const duration = body.duration || 5;
    const imageUrl = body.image_url;

    // ── Idempotency-Key 處理（影片貴 NT$50-200/支，更需要） ──
    idempotencyKey = req.headers.get("idempotency-key");
    if (idempotencyKey) {
      const requestHash = hashRequest("POST", "/v1/videos/generations", body);
      const outcome = await beginIdempotency(idempotencyKey, apiKey.id, requestHash);
      if (outcome.kind === "invalid_format") {
        return NextResponse.json(
          { error: { message: "Idempotency-Key must be 8-255 chars of [A-Za-z0-9_-]", type: "invalid_request_error" } },
          { status: 400 }
        );
      }
      if (outcome.kind === "conflict") {
        return NextResponse.json(
          { error: { message: "Idempotency-Key was reused with a different request body", type: "idempotency_conflict" } },
          { status: 422 }
        );
      }
      if (outcome.kind === "in_progress") {
        return NextResponse.json(
          { error: { message: "A request with this Idempotency-Key is already in progress", type: "idempotency_in_progress" } },
          { status: 409 }
        );
      }
      if (outcome.kind === "replay") {
        return NextResponse.json(outcome.body, {
          status: outcome.status,
          headers: { ...outcome.headers, "Idempotent-Replayed": "true" },
        });
      }
      idempotencyActive = true;
    }

    if (!VIDEO_COST_RMB_PER_SEC[model]) {
      return NextResponse.json(
        { error: { message: `Unsupported video model: ${model}. Available: ${Object.keys(VIDEO_COST_RMB_PER_SEC).join(", ")}`, type: "invalid_request" } },
        { status: 400 }
      );
    }

    if (!prompt && !imageUrl) {
      return NextResponse.json(
        { error: { message: "prompt or image_url is required", type: "invalid_request" } },
        { status: 400 }
      );
    }

    const volcKey = VOLCENGINE_API_KEY();
    if (!volcKey) {
      return NextResponse.json(
        { error: { message: "Video generation service not configured", type: "service_unavailable" } },
        { status: 503 }
      );
    }

    const reqBody: Record<string, unknown> = {
      model,
      content: [
        { type: "text", text: prompt || "" },
      ],
    };

    if (imageUrl) {
      (reqBody.content as Array<Record<string, unknown>>).push({
        type: "image_url",
        image_url: { url: imageUrl },
      });
    }

    if (duration) {
      reqBody.generation_config = { duration };
    }

    const response = await fetch(VOLCENGINE_VIDEO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${volcKey}`,
      },
      body: JSON.stringify(reqBody),
    });

    log.info("video.request", {
      request_id: requestId,
      tenant_id: apiKey.tenantId,
      api_key_id: apiKey.id,
      model,
      duration,
      idempotency: !!idempotencyKey,
    });

    if (!response.ok) {
      const errText = await response.text();
      // 上游失敗 → 釋放 idempotency 鎖讓客戶可重試
      if (idempotencyActive) {
        await abortIdempotency(idempotencyKey!, apiKey.id).catch(() => {});
      }
      log.error("video.upstream_error", {
        request_id: requestId,
        tenant_id: apiKey.tenantId,
        upstream_status: response.status,
        latency_ms: Date.now() - startTime,
      });
      await log.flush(); // P1 #6: 確保 Sentry event 在 serverless freeze 前送出
      return NextResponse.json(
        { error: { message: `Video generation error: ${response.status}`, type: "upstream_error", details: errText } },
        { status: response.status, headers: { "X-Request-Id": requestId } }
      );
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;
    const { costNtd, billedNtd } = calculateVideoBilledNtd(model, duration);
    const costUsd = costNtd / 32;

    await recordUsage({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: apiKey.tenantId,
      apiKeyId: apiKey.id,
      model: `video/${model}`,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd,
      billedNtd,
      latencyMs,
      status: "success",
    });

    const responseBody = {
      ...data,
      _nplus: {
        provider: "volcengine",
        model,
        duration,
        costNtd: Math.round(costNtd * 100) / 100,
        billedNtd,
        latencyMs,
      },
    };

    if (idempotencyActive) {
      await finalizeIdempotency(idempotencyKey!, apiKey.id, {
        status: 200,
        body: responseBody,
        headers: { "X-Provider": "volcengine", "X-Request-Id": requestId },
      }).catch(() => {});
    }

    log.info("video.success", {
      request_id: requestId,
      tenant_id: apiKey.tenantId,
      model,
      duration,
      billed_ntd: billedNtd,
      latency_ms: latencyMs,
    });

    return NextResponse.json(responseBody, {
      headers: { "X-Request-Id": requestId, "X-Provider": "volcengine" },
    });
  } catch (error) {
    // 內部錯誤 → 釋放 idempotency 鎖
    if (idempotencyActive) {
      await abortIdempotency(idempotencyKey!, apiKey.id).catch(() => {});
    }
    log.error("video.internal_error", {
      request_id: requestId,
      tenant_id: apiKey.tenantId,
      error: error instanceof Error ? error.message : "unknown",
      latency_ms: Date.now() - startTime,
    });
    const latencyMs = Date.now() - startTime;
    await recordUsage({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: apiKey.tenantId,
      apiKeyId: apiKey.id,
      model: "video/unknown",
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      billedNtd: 0,
      latencyMs,
      status: "error",
    });

    await log.flush(); // P1 #6: 確保 Sentry event 在 serverless freeze 前送出
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Internal error", type: "internal_error" } },
      { status: 500 }
    );
  }
}
