import { type Provider, getModelDef } from "./pricing";

interface ProviderConfig {
  baseUrl: string;
  authHeader: (key: string) => Record<string, string>;
  transformRequest: (body: Record<string, unknown>, providerModel: string) => Record<string, unknown>;
  extractUsage: (data: Record<string, unknown>) => { inputTokens: number; outputTokens: number; cachedTokens: number };
}

const PROVIDER_CONFIGS: Record<Provider, ProviderConfig> = {
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1/messages",
    authHeader: (key) => ({
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
    }),
    transformRequest: (body, providerModel) => {
      const messages = (body.messages as Array<Record<string, unknown>>) || [];
      const systemMessages = messages.filter((m) => m.role === "system");
      const nonSystemMessages = messages.filter((m) => m.role !== "system");

      const system = systemMessages.length > 0
        ? systemMessages.map((m) => ({
            type: "text",
            text: String(m.content),
            cache_control: { type: "ephemeral" as const },
          }))
        : undefined;

      return {
        model: providerModel,
        max_tokens: (body.max_tokens as number) || 4096,
        stream: body.stream || false,
        system,
        messages: nonSystemMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };
    },
    extractUsage: (data) => ({
      inputTokens: (data.usage as Record<string, number>)?.input_tokens || 0,
      outputTokens: (data.usage as Record<string, number>)?.output_tokens || 0,
      cachedTokens: (data.usage as Record<string, number>)?.cache_read_input_tokens || 0,
    }),
  },

  openai: {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    transformRequest: (body, providerModel) => ({ ...body, model: providerModel }),
    extractUsage: (data) => {
      const usage = data.usage as Record<string, unknown> | undefined;
      return {
        inputTokens: (usage?.prompt_tokens as number) || 0,
        outputTokens: (usage?.completion_tokens as number) || 0,
        cachedTokens: ((usage?.prompt_tokens_details as Record<string, number>)?.cached_tokens) || 0,
      };
    },
  },

  google: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/models",
    authHeader: () => ({}),
    transformRequest: (body, providerModel) => {
      const messages = (body.messages as Array<Record<string, unknown>>) || [];
      return {
        _googleModel: providerModel,
        contents: messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: String(m.content) }],
          })),
        systemInstruction: (() => {
          const sys = messages.find((m) => m.role === "system");
          return sys ? { parts: [{ text: String(sys.content) }] } : undefined;
        })(),
        generationConfig: {
          maxOutputTokens: (body.max_tokens as number) || 4096,
        },
      };
    },
    extractUsage: (data) => {
      const meta = data.usageMetadata as Record<string, number> | undefined;
      return {
        inputTokens: meta?.promptTokenCount || 0,
        outputTokens: meta?.candidatesTokenCount || 0,
        cachedTokens: meta?.cachedContentTokenCount || 0,
      };
    },
  },

  dashscope: {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    transformRequest: (body, providerModel) => ({ ...body, model: providerModel }),
    extractUsage: (data) => {
      const usage = data.usage as Record<string, number> | undefined;
      return {
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
        cachedTokens: 0,
      };
    },
  },

  deepseek: {
    baseUrl: "https://api.deepseek.com/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    transformRequest: (body, providerModel) => ({ ...body, model: providerModel }),
    extractUsage: (data) => {
      const usage = data.usage as Record<string, unknown> | undefined;
      return {
        inputTokens: (usage?.prompt_tokens as number) || 0,
        outputTokens: (usage?.completion_tokens as number) || 0,
        cachedTokens: ((usage?.prompt_tokens_details as Record<string, number>)?.cached_tokens) || 0,
      };
    },
  },

  volcengine: {
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    transformRequest: (body, providerModel) => ({ ...body, model: providerModel }),
    extractUsage: (data) => {
      const usage = data.usage as Record<string, number> | undefined;
      return {
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
        cachedTokens: 0,
      };
    },
  },

  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    authHeader: (key) => ({
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://api.nplusstar.ai",
      "X-Title": "N+Star API Gateway",
    }),
    transformRequest: (body, providerModel) => ({ ...body, model: providerModel }),
    extractUsage: (data) => ({
      inputTokens: (data.usage as Record<string, number>)?.prompt_tokens || 0,
      outputTokens: (data.usage as Record<string, number>)?.completion_tokens || 0,
      cachedTokens: 0,
    }),
  },
};

const PROVIDER_KEYS: Record<Provider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
  dashscope: "DASHSCOPE_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  volcengine: "VOLCENGINE_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

function getProviderKey(provider: Provider): string {
  const envKey = PROVIDER_KEYS[provider];
  return process.env[envKey] || "";
}

export interface ProviderResponse {
  response: Response;
  provider: Provider;
  providerModel: string;
}

export function resolveProvider(model: string): { provider: Provider; providerModel: string; config: ProviderConfig } | null {
  const def = getModelDef(model);
  if (!def) return null;

  const key = getProviderKey(def.provider);
  if (!key && def.provider !== "google") {
    const orKey = getProviderKey("openrouter");
    if (orKey) {
      return {
        provider: "openrouter",
        providerModel: model,
        config: PROVIDER_CONFIGS.openrouter,
      };
    }
    return null;
  }

  return {
    provider: def.provider,
    providerModel: def.providerModel,
    config: PROVIDER_CONFIGS[def.provider],
  };
}

export async function callProvider(
  model: string,
  body: Record<string, unknown>
): Promise<{ response: Response; provider: Provider; providerModel: string }> {
  const resolved = resolveProvider(model);
  if (!resolved) {
    throw new Error(`No provider available for model: ${model}`);
  }

  const { provider, providerModel, config } = resolved;
  const apiKey = getProviderKey(provider);
  const transformedBody = config.transformRequest(body, providerModel);

  let url = config.baseUrl;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...config.authHeader(apiKey),
  };

  if (provider === "google") {
    const googleModel = (transformedBody as Record<string, unknown>)._googleModel;
    delete (transformedBody as Record<string, unknown>)._googleModel;
    const action = body.stream ? "streamGenerateContent" : "generateContent";
    const altParam = body.stream ? "&alt=sse" : "";
    url = `${config.baseUrl}/${googleModel}:${action}?key=${apiKey}${altParam}`;
    delete headers["Content-Type"];
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(transformedBody),
  });

  return { response, provider, providerModel };
}

export function extractUsage(provider: Provider, data: Record<string, unknown>) {
  return PROVIDER_CONFIGS[provider].extractUsage(data);
}

/**
 * Normalize provider response to OpenAI chat.completion shape so that
 * callers (web chat UI, OpenAI-SDK clients) can read `choices[0].message.content`
 * uniformly regardless of upstream provider.
 *
 * OpenAI / DeepSeek / DashScope / Volcengine / OpenRouter already use this shape.
 * Google Gemini and Anthropic return their native shapes and need translation.
 */
export function normalizeToOpenAI(
  provider: Provider,
  data: Record<string, unknown>,
  model: string
): Record<string, unknown> {
  if (provider === "google") {
    const candidates = (data.candidates as Array<Record<string, unknown>>) || [];
    const choices = candidates.map((c, idx) => {
      const content = c.content as Record<string, unknown> | undefined;
      const parts = (content?.parts as Array<Record<string, unknown>>) || [];
      const text = parts.map((p) => String(p.text ?? "")).join("");
      const finishReason = String(c.finishReason ?? "stop").toLowerCase();
      return {
        index: idx,
        message: { role: "assistant", content: text },
        finish_reason: finishReason === "stop" ? "stop" : finishReason,
      };
    });
    const meta = data.usageMetadata as Record<string, number> | undefined;
    return {
      id: String(data.responseId ?? `chatcmpl-${Date.now()}`),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: String(data.modelVersion ?? model),
      choices,
      usage: {
        prompt_tokens: meta?.promptTokenCount ?? 0,
        completion_tokens: meta?.candidatesTokenCount ?? 0,
        total_tokens: meta?.totalTokenCount ?? 0,
      },
    };
  }

  if (provider === "anthropic") {
    const contentBlocks = (data.content as Array<Record<string, unknown>>) || [];
    const text = contentBlocks
      .filter((b) => b.type === "text")
      .map((b) => String(b.text ?? ""))
      .join("");
    const usage = data.usage as Record<string, number> | undefined;
    return {
      id: String(data.id ?? `chatcmpl-${Date.now()}`),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: String(data.model ?? model),
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: text },
          finish_reason: String(data.stop_reason ?? "stop") === "end_turn" ? "stop" : String(data.stop_reason ?? "stop"),
        },
      ],
      usage: {
        prompt_tokens: usage?.input_tokens ?? 0,
        completion_tokens: usage?.output_tokens ?? 0,
        total_tokens: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
      },
    };
  }

  // OpenAI-compatible providers — return as-is
  return data;
}

/**
 * Normalize a streaming chunk (raw provider data) into OpenAI SSE format.
 *
 * Returns:
 * - For Google/Anthropic: an OpenAI-shaped chunk JSON
 * - For OpenAI-compatible providers: the raw chunk JSON (already correct shape)
 *
 * Returns null if chunk should be skipped (e.g. heartbeat, parse failure).
 */
export function normalizeStreamChunk(
  provider: Provider,
  rawChunk: Record<string, unknown>,
  model: string,
  chunkId: string,
  isFinal = false,
): Record<string, unknown> | null {
  if (provider === "google") {
    const candidates = (rawChunk.candidates as Array<Record<string, unknown>>) || [];
    if (candidates.length === 0) return null;
    const choices = candidates.map((c, idx) => {
      const content = c.content as Record<string, unknown> | undefined;
      const parts = (content?.parts as Array<Record<string, unknown>>) || [];
      const text = parts.map((p) => String(p.text ?? "")).join("");
      const finishReason = c.finishReason ? String(c.finishReason).toLowerCase() : null;
      return {
        index: idx,
        delta: text ? { role: "assistant", content: text } : {},
        finish_reason: finishReason === "stop" || isFinal ? "stop" : null,
      };
    });
    return {
      id: chunkId,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: String(rawChunk.modelVersion ?? model),
      choices,
    };
  }

  if (provider === "anthropic") {
    // Anthropic SSE has multiple event types: message_start, content_block_delta, message_delta, message_stop
    const eventType = rawChunk.type as string | undefined;
    if (eventType === "content_block_delta") {
      const delta = rawChunk.delta as Record<string, unknown> | undefined;
      const text = delta?.type === "text_delta" ? String(delta.text ?? "") : "";
      if (!text) return null;
      return {
        id: chunkId,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          { index: 0, delta: { content: text }, finish_reason: null },
        ],
      };
    }
    if (eventType === "message_delta") {
      const delta = rawChunk.delta as Record<string, unknown> | undefined;
      const stopReason = delta?.stop_reason as string | undefined;
      if (stopReason) {
        return {
          id: chunkId,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            { index: 0, delta: {}, finish_reason: stopReason === "end_turn" ? "stop" : stopReason },
          ],
        };
      }
    }
    if (eventType === "message_start") {
      return {
        id: chunkId,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          { index: 0, delta: { role: "assistant", content: "" }, finish_reason: null },
        ],
      };
    }
    return null;
  }

  // OpenAI-compatible providers — pass through
  return rawChunk;
}

// ---------------------------------------------------------------------------
// Retry + fallback wrapper
// ---------------------------------------------------------------------------

const RETRY_DELAYS = [1000, 3000]; // backoff between attempt 1→2 and 2→3
const MAX_ATTEMPTS = 3;

function isRetryable(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls a provider with up to 3 attempts (exponential backoff on 429 / 5xx).
 * If all retries are exhausted, falls back to OpenRouter (unless the original
 * provider was already OpenRouter). If the fallback also fails, the *original*
 * error response is returned.
 */
export async function callProviderWithRetry(
  model: string,
  body: Record<string, unknown>
): Promise<{ response: Response; provider: Provider; providerModel: string }> {
  let lastResult: { response: Response; provider: Provider; providerModel: string } | undefined;

  // --- Primary provider: up to MAX_ATTEMPTS ---
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await callProvider(model, body);

    // Success or non-retryable error — return immediately
    if (result.response.ok || !isRetryable(result.response.status)) {
      return result;
    }

    console.log(
      `[Retry] ${model} attempt ${attempt}/${MAX_ATTEMPTS} - status ${result.response.status}`
    );

    lastResult = result;

    // Wait before next attempt (but not after the final attempt)
    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAYS[attempt - 1]);
    }
  }

  // --- Fallback: try via OpenRouter ---
  const resolved = resolveProvider(model);
  if (resolved && resolved.provider !== "openrouter") {
    try {
      console.log(`[Fallback] ${model} -> openrouter`);

      const def = getModelDef(model);
      // Build a fallback model identifier that OpenRouter understands.
      // We pass the original user-facing model name (e.g. "anthropic/claude-sonnet-4-6")
      // because OpenRouter routes by that key, and for models not in its catalog
      // we also try the provider-specific providerModel.
      const openrouterModel = def?.providerModel ?? model;

      const orConfig = PROVIDER_CONFIGS.openrouter;
      const orKey = getProviderKey("openrouter");
      const transformedBody = orConfig.transformRequest(body, openrouterModel);

      const fallbackResponse = await fetch(orConfig.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...orConfig.authHeader(orKey),
        },
        body: JSON.stringify(transformedBody),
      });

      if (fallbackResponse.ok || !isRetryable(fallbackResponse.status)) {
        return {
          response: fallbackResponse,
          provider: "openrouter",
          providerModel: openrouterModel,
        };
      }
    } catch (err) {
      // Fallback network error — fall through to return original error
      console.log(`[Fallback] openrouter request failed: ${err}`);
    }
  }

  // Return the last failed response from the primary provider
  return lastResult!;
}
