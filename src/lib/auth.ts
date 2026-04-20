import { NextRequest } from "next/server";

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  tenantId: string;
  tenantName: string;
  plan: "light" | "standard" | "pro" | "enterprise";
  rateLimitRpm: number;
  enabled: boolean;
}

// API keys stored in environment variable as JSON
function loadKeys(): ApiKey[] {
  const raw = process.env.API_KEYS;
  if (!raw) {
    return [
      {
        id: "key-001",
        key: "nplus_sk_demo_test_key_for_internal_use_2026_nplusstar",
        name: "Internal Test Key",
        tenantId: "tenant-nstar",
        tenantName: "恩加斯達國際",
        plan: "enterprise",
        rateLimitRpm: 500,
        enabled: true,
      },
    ];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function validateApiKey(
  req: NextRequest
): { valid: true; apiKey: ApiKey } | { valid: false; error: string } {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid Authorization header" };
  }

  const key = authHeader.slice(7);
  const keys = loadKeys();
  const found = keys.find((k) => k.key === key && k.enabled);

  if (!found) {
    return { valid: false, error: "Invalid API key" };
  }

  return { valid: true, apiKey: found };
}

export function getAllKeys(): ApiKey[] {
  return loadKeys();
}
