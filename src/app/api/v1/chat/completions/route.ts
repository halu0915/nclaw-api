import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, checkModelPermission } from "@/lib/auth";
import { recordUsage } from "@/lib/usage";
import { calculateCost } from "@/lib/pricing";
import { callProviderWithRetry, extractUsage } from "@/lib/providers";
import { checkRateLimit } from "@/lib/rate-limiter";
import { checkDepartmentQuota, incrementDepartmentUsage } from "@/lib/departments";
import { ensureDemoTenant } from "@/lib/tenant";
import {
  beginIdempotency,
  finalizeIdempotency,
  abortIdempotency,
  hashRequest,
} from "@/lib/idempotency";
import { log, newRequestId } from "@/lib/log";

const MAX_BODY_BYTES = 1_000_000; // 1 MB; OpenAI 單請求上限約 200K tokens 也夠

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const auth = await validateApiKey(req);
  if (!auth.valid) {
    log.warn("chat.auth_fail", { request_id: requestId, error: auth.error });
    return NextResponse.json(
      { error: { message: auth.error, type: "authentication_error" } },
      { status: 401, headers: { "X-Request-Id": requestId } }
    );
  }

  const { apiKey } = auth;
  const startTime = Date.now();
  await ensureDemoTenant();

  // 請求大小防禦
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: { message: `Request body too large (max ${MAX_BODY_BYTES} bytes)`, type: "payload_too_large" } },
      { status: 413 }
    );
  }

  // 在 try 外宣告，讓 catch 也能存取
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

    let body: { model?: string; stream?: boolean; [k: string]: unknown };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: { message: "Invalid JSON body", type: "invalid_request_error" } },
        { status: 400 }
      );
    }

    const model = (body.model as string) || "qwen/qwen3.6-plus";
    const stream = (body.stream as boolean) || false;

    // ── Idempotency-Key 處理（OpenAI 相容 header） ──
    idempotencyKey = req.headers.get("idempotency-key");
    if (idempotencyKey) {
      const requestHash = hashRequest("POST", "/v1/chat/completions", body);
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
      // fresh → 繼續處理
      idempotencyActive = true;
    }

    // 串流請求不快取 idempotency 結果（會在處理過程中釋放 key 鎖）
    if (idempotencyActive && stream) {
      await abortIdempotency(idempotencyKey!, apiKey.id);
      idempotencyActive = false;
    }

    if (!checkModelPermission(apiKey, model)) {
      return NextResponse.json(
        { error: { message: `Model ${model} not allowed for this API key`, type: "permission_error" } },
        { status: 403 }
      );
    }

    const rateCheck = await checkRateLimit(apiKey.id, apiKey.rateLimitRpm);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: { message: "Rate limit exceeded", type: "rate_limit_error", retryAfterMs: rateCheck.resetMs } },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.resetMs / 1000)) } }
      );
    }

    if (apiKey.departmentId) {
      const quota = await checkDepartmentQuota(apiKey.departmentId);
      if (!quota.allowed) {
        return NextResponse.json(
          { error: { message: `Department quota exceeded (${quota.used}/${quota.quota} tokens)`, type: "quota_error" } },
          { status: 429 }
        );
      }
    }

    log.info("chat.request", {
      request_id: requestId,
      tenant_id: apiKey.tenantId,
      api_key_id: apiKey.id,
      model,
      stream,
      idempotency: !!idempotencyKey,
    });

    const { response: providerRes, provider } = await callProviderWithRetry(model, body);

    if (!providerRes.ok) {
      const errText = await providerRes.text();
      // 上游失敗 → 釋放 idempotency 鎖讓客戶可重試
      if (idempotencyActive) {
        await abortIdempotency(idempotencyKey!, apiKey.id).catch(() => {});
      }
      log.error("chat.upstream_error", {
        request_id: requestId,
        tenant_id: apiKey.tenantId,
        provider,
        upstream_status: providerRes.status,
        latency_ms: Date.now() - startTime,
      });
      await log.flush(); // P1 #6: 確保 Sentry event 在 serverless freeze 前送出
      return NextResponse.json(
        {
          error: {
            message: `Upstream error: ${providerRes.status}`,
            type: "upstream_error",
            provider,
            details: errText,
          },
        },
        { status: providerRes.status }
      );
    }

    if (stream && providerRes.body) {
      const reader = providerRes.body.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      let inputTokens = 0;
      let outputTokens = 0;
      let cachedTokens = 0;

      const readable = new ReadableStream({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            const latencyMs = Date.now() - startTime;
            const { costUsd, billedNtd } = calculateCost(
              model, inputTokens, outputTokens, apiKey.plan, cachedTokens
            );
            await recordUsage({
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              tenantId: apiKey.tenantId,
              apiKeyId: apiKey.id,
              departmentId: apiKey.departmentId || undefined,
              provider,
              model,
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
              costUsd,
              billedNtd,
              latencyMs,
              status: "success",
            });
            if (apiKey.departmentId) {
              await incrementDepartmentUsage(apiKey.departmentId, inputTokens + outputTokens).catch(() => {});
            }
            controller.close();
            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.usage) {
                  const usage = extractUsage(provider, data);
                  inputTokens = usage.inputTokens || inputTokens;
                  outputTokens = usage.outputTokens || outputTokens;
                  cachedTokens = usage.cachedTokens || cachedTokens;
                }
              } catch {
                // Skip unparseable chunks
              }
            }
          }

          controller.enqueue(encoder.encode(chunk));
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Powered-By": "N+Star API Gateway",
          "X-Provider": provider,
        },
      });
    }

    // Non-streaming
    const data = await providerRes.json();
    const latencyMs = Date.now() - startTime;
    const usage = extractUsage(provider, data);

    const { costUsd, billedNtd } = calculateCost(
      model, usage.inputTokens, usage.outputTokens, apiKey.plan, usage.cachedTokens
    );

    await recordUsage({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: apiKey.tenantId,
      apiKeyId: apiKey.id,
      departmentId: apiKey.departmentId || undefined,
      provider,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.inputTokens + usage.outputTokens,
      costUsd,
      billedNtd,
      latencyMs,
      status: "success",
    });

    if (apiKey.departmentId) {
      await incrementDepartmentUsage(apiKey.departmentId, usage.inputTokens + usage.outputTokens).catch(() => {});
    }

    const responseBody = {
      ...data,
      _nplus: {
        provider,
        cached: usage.cachedTokens > 0,
        cachedTokens: usage.cachedTokens,
        billedTokens: usage.inputTokens + usage.outputTokens,
        billedNtd,
        latencyMs,
      },
    };

    // 把成功回應寫進 idempotency 紀錄
    if (idempotencyActive) {
      await finalizeIdempotency(idempotencyKey!, apiKey.id, {
        status: 200,
        body: responseBody,
        headers: { "X-Provider": provider, "X-Request-Id": requestId },
      }).catch(() => {});
    }

    log.info("chat.success", {
      request_id: requestId,
      tenant_id: apiKey.tenantId,
      provider,
      model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cached_tokens: usage.cachedTokens,
      billed_ntd: billedNtd,
      latency_ms: latencyMs,
    });

    return NextResponse.json(responseBody, {
      headers: { "X-Request-Id": requestId, "X-Provider": provider },
    });
  } catch (error) {
    // 內部錯誤 → 釋放 idempotency 鎖
    if (idempotencyActive) {
      await abortIdempotency(idempotencyKey!, apiKey.id).catch(() => {});
    }
    log.error("chat.internal_error", {
      request_id: requestId,
      tenant_id: apiKey.tenantId,
      error: error instanceof Error ? error.message : "unknown",
      stack: error instanceof Error ? error.stack : undefined,
      latency_ms: Date.now() - startTime,
    });
    const latencyMs = Date.now() - startTime;
    await recordUsage({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: apiKey.tenantId,
      apiKeyId: apiKey.id,
      departmentId: apiKey.departmentId || undefined,
      model: "unknown",
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      billedNtd: 0,
      latencyMs,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Internal error",
    }).catch(() => {});

    await log.flush(); // P1 #6: 確保 Sentry event 在 serverless freeze 前送出
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : "Internal error",
          type: "internal_error",
        },
      },
      { status: 500 }
    );
  }
}
