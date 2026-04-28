export type Provider = "anthropic" | "openai" | "google" | "dashscope" | "deepseek" | "volcengine" | "openrouter";

interface ModelDef {
  input: number;
  output: number;
  cachedInput: number;
  provider: Provider;
  providerModel: string;
  contextWindow: number;
  supportsCache: boolean;
}

const MODEL_COSTS: Record<string, ModelDef> = {
  // Anthropic — direct API, prompt caching supported
  "anthropic/claude-opus-4-7": { input: 5, output: 25, cachedInput: 0.5, provider: "anthropic", providerModel: "claude-opus-4-7-20260401", contextWindow: 200_000, supportsCache: true },
  "anthropic/claude-sonnet-4-6": { input: 3, output: 15, cachedInput: 0.3, provider: "anthropic", providerModel: "claude-sonnet-4-6-20250929", contextWindow: 200_000, supportsCache: true },
  "anthropic/claude-haiku-4-5": { input: 0.8, output: 4, cachedInput: 0.08, provider: "anthropic", providerModel: "claude-haiku-4-5-20251001", contextWindow: 200_000, supportsCache: true },
  // OpenAI — direct API, automatic caching
  "openai/gpt-5.5": { input: 5, output: 30, cachedInput: 2.5, provider: "openai", providerModel: "gpt-5.5", contextWindow: 256_000, supportsCache: true },
  "openai/gpt-4o": { input: 2.5, output: 10, cachedInput: 1.25, provider: "openai", providerModel: "gpt-4o", contextWindow: 128_000, supportsCache: true },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6, cachedInput: 0.075, provider: "openai", providerModel: "gpt-4o-mini", contextWindow: 128_000, supportsCache: true },
  "openai/o1": { input: 15, output: 60, cachedInput: 7.5, provider: "openai", providerModel: "o1", contextWindow: 200_000, supportsCache: true },
  // Google — direct API
  "google/gemini-2.5-pro": { input: 1.25, output: 10, cachedInput: 0.3, provider: "google", providerModel: "gemini-2.5-pro", contextWindow: 1_000_000, supportsCache: true },
  "google/gemini-2.5-flash": { input: 0.15, output: 0.6, cachedInput: 0.04, provider: "google", providerModel: "gemini-2.5-flash", contextWindow: 1_000_000, supportsCache: true },
  // Qwen — via OpenRouter (DASHSCOPE_API_KEY not yet configured)
  "qwen/qwen3.6-plus": { input: 0.325, output: 1.95, cachedInput: 0.325, provider: "openrouter", providerModel: "qwen/qwen3.6-plus", contextWindow: 1_000_000, supportsCache: false },
  "qwen/qwen3.5-397b-a17b": { input: 0.3, output: 1.2, cachedInput: 0.3, provider: "openrouter", providerModel: "qwen/qwen3.5-397b-a17b", contextWindow: 131_072, supportsCache: false },
  // DeepSeek — direct API
  "deepseek/deepseek-v4": { input: 0.1, output: 0.4, cachedInput: 0.01, provider: "deepseek", providerModel: "deepseek-chat", contextWindow: 128_000, supportsCache: true },
  "deepseek/deepseek-r1": { input: 0.55, output: 2.19, cachedInput: 0.14, provider: "deepseek", providerModel: "deepseek-reasoner", contextWindow: 128_000, supportsCache: true },
  // Volcengine (ByteDance) — 豆包 Seed 2.0
  "doubao/seed-2.0": { input: 0.47, output: 2.37, cachedInput: 0.05, provider: "volcengine", providerModel: "ep-20260427174444-p8wz2", contextWindow: 128_000, supportsCache: false },
  "doubao/seed-2.0-pro": { input: 0.47, output: 2.37, cachedInput: 0.05, provider: "volcengine", providerModel: "ep-20260427180602-dtqpd", contextWindow: 128_000, supportsCache: false },
  "doubao/seed-2.0-lite": { input: 0.13, output: 0.76, cachedInput: 0.01, provider: "volcengine", providerModel: "ep-20260427180705-9g8vq", contextWindow: 128_000, supportsCache: false },
  "doubao/seed-2.0-mini": { input: 0.06, output: 0.56, cachedInput: 0.01, provider: "volcengine", providerModel: "ep-20260427180110-5nscj", contextWindow: 128_000, supportsCache: false },
  // Meta via OpenRouter
  "meta-llama/llama-3.1-405b-instruct": { input: 2, output: 6, cachedInput: 2, provider: "openrouter", providerModel: "meta-llama/llama-3.1-405b-instruct", contextWindow: 131_072, supportsCache: false },
  "meta-llama/llama-3.1-70b-instruct": { input: 0.4, output: 0.4, cachedInput: 0.4, provider: "openrouter", providerModel: "meta-llama/llama-3.1-70b-instruct", contextWindow: 131_072, supportsCache: false },
  "meta-llama/llama-3.1-8b-instruct": { input: 0.05, output: 0.05, cachedInput: 0.05, provider: "openrouter", providerModel: "meta-llama/llama-3.1-8b-instruct", contextWindow: 131_072, supportsCache: false },
};

const PLAN_MARKUP: Record<string, number> = {
  free: 3.0,
  developer: 1.2,
  light: 3.0,
  standard: 2.5,
  pro: 2.0,
  enterprise: 1.5,
};

const USD_TO_NTD = 32;

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  plan: string,
  cachedTokens = 0
): { costUsd: number; billedNtd: number } {
  const m = MODEL_COSTS[model] || { input: 1, output: 3, cachedInput: 0.1 };
  const markup = PLAN_MARKUP[plan] || 2.5;

  const nonCachedInput = Math.max(0, inputTokens - cachedTokens);
  const costUsd =
    (nonCachedInput * m.input) / 1_000_000 +
    (cachedTokens * m.cachedInput) / 1_000_000 +
    (outputTokens * m.output) / 1_000_000;

  const billedNtd = costUsd * markup * USD_TO_NTD;

  return {
    costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
    billedNtd: Math.round(billedNtd * 100) / 100,
  };
}

export function getModelDef(model: string): ModelDef | undefined {
  return MODEL_COSTS[model];
}

export function getAvailableModels() {
  return Object.entries(MODEL_COSTS).map(([id, m]) => ({
    id,
    provider: m.provider,
    contextWindow: m.contextWindow,
    supportsCache: m.supportsCache,
    pricing: {
      inputPer1M: m.input,
      outputPer1M: m.output,
      cachedInputPer1M: m.cachedInput,
    },
  }));
}

export { MODEL_COSTS, PLAN_MARKUP, USD_TO_NTD };
