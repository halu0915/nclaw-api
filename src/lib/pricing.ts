// Model pricing (USD per 1M tokens) - based on OpenRouter rates
// We add a markup for our service

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // Anthropic
  "anthropic/claude-opus-4-6": { input: 15, output: 75 },
  "anthropic/claude-sonnet-4-6": { input: 3, output: 15 },
  "anthropic/claude-haiku-4-5": { input: 0.8, output: 4 },
  // OpenAI
  "openai/gpt-4o": { input: 2.5, output: 10 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai/o1": { input: 15, output: 60 },
  // Google
  "google/gemini-2.5-pro": { input: 1.25, output: 10 },
  "google/gemini-2.5-flash": { input: 0.15, output: 0.6 },
  // Meta
  "meta-llama/llama-3.1-405b-instruct": { input: 2, output: 6 },
  "meta-llama/llama-3.1-70b-instruct": { input: 0.4, output: 0.4 },
  "meta-llama/llama-3.1-8b-instruct": { input: 0.05, output: 0.05 },
  // Qwen
  "qwen/qwen3.5-397b-a17b": { input: 0.3, output: 1.2 },
  // DeepSeek
  "deepseek/deepseek-r1": { input: 0.55, output: 2.19 },
  "deepseek/deepseek-chat-v3": { input: 0.27, output: 1.1 },
};

// Markup multiplier by plan
const PLAN_MARKUP: Record<string, number> = {
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
  plan: string
): { costUsd: number; billedNtd: number } {
  const pricing = MODEL_COSTS[model] || { input: 1, output: 3 };
  const markup = PLAN_MARKUP[plan] || 2.5;

  const costUsd =
    (inputTokens * pricing.input) / 1_000_000 +
    (outputTokens * pricing.output) / 1_000_000;

  const billedNtd = costUsd * markup * USD_TO_NTD;

  return {
    costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
    billedNtd: Math.round(billedNtd * 100) / 100,
  };
}

export function getAvailableModels() {
  return Object.entries(MODEL_COSTS).map(([id, pricing]) => ({
    id,
    pricing: {
      inputPer1M: pricing.input,
      outputPer1M: pricing.output,
    },
  }));
}
