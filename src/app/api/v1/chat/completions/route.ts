import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth";
import { recordUsage } from "@/lib/usage";
import { calculateCost } from "@/lib/pricing";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export async function POST(req: NextRequest) {
  // Validate API key
  const auth = validateApiKey(req);
  if (!auth.valid) {
    return NextResponse.json(
      { error: { message: auth.error, type: "authentication_error" } },
      { status: 401 }
    );
  }

  const { apiKey } = auth;
  const startTime = Date.now();

  try {
    const body = await req.json();
    const model = body.model || "qwen/qwen3.5-397b-a17b";
    const stream = body.stream || false;

    // Forward to OpenRouter
    const orResponse = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://api.nplusstar.ai",
        "X-Title": "N+Claw API Gateway",
      },
      body: JSON.stringify({
        ...body,
        model,
      }),
    });

    if (!orResponse.ok) {
      const errText = await orResponse.text();
      return NextResponse.json(
        {
          error: {
            message: `Upstream error: ${orResponse.status}`,
            type: "upstream_error",
            details: errText,
          },
        },
        { status: orResponse.status }
      );
    }

    // Streaming response
    if (stream && orResponse.body) {
      const reader = orResponse.body.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      let inputTokens = 0;
      let outputTokens = 0;

      const readable = new ReadableStream({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            // Record usage after stream ends
            const latencyMs = Date.now() - startTime;
            const { costUsd, billedNtd } = calculateCost(
              model,
              inputTokens,
              outputTokens,
              apiKey.plan
            );
            recordUsage({
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              tenantId: apiKey.tenantId,
              apiKeyId: apiKey.id,
              model,
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
              costUsd,
              billedNtd,
              latencyMs,
              status: "success",
            });
            controller.close();
            return;
          }

          // Parse SSE chunks to extract token usage
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.usage) {
                  inputTokens = data.usage.prompt_tokens || inputTokens;
                  outputTokens = data.usage.completion_tokens || outputTokens;
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
          "X-Powered-By": "N+Claw API Gateway",
        },
      });
    }

    // Non-streaming response
    const data = await orResponse.json();
    const latencyMs = Date.now() - startTime;

    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    const { costUsd, billedNtd } = calculateCost(
      model,
      inputTokens,
      outputTokens,
      apiKey.plan
    );

    // Record usage
    recordUsage({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: apiKey.tenantId,
      apiKeyId: apiKey.id,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      costUsd,
      billedNtd,
      latencyMs,
      status: "success",
    });

    // Return response with our branding
    return NextResponse.json({
      ...data,
      _nclaw: {
        billedTokens: inputTokens + outputTokens,
        billedNtd,
        latencyMs,
      },
    });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    recordUsage({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: apiKey.tenantId,
      apiKeyId: apiKey.id,
      model: "unknown",
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      billedNtd: 0,
      latencyMs,
      status: "error",
    });

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
