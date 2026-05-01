import { NextRequest } from "next/server";
import { query } from "./db";
import crypto from "crypto";
import { ensureDemoTenant } from "./tenant";

export interface ApiKey {
  id: string;
  tenantId: string;
  departmentId: string | null;
  name: string;
  plan: "free" | "developer" | "light" | "standard" | "pro" | "enterprise";
  rateLimitRpm: number;
  allowedModels: string[] | null;
  enabled: boolean;
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function findKeyInDb(rawKey: string): Promise<ApiKey | null> {
  try {
    const hash = hashKey(rawKey);
    const result = await query(
      `SELECT id, tenant_id, department_id, name, plan, rate_limit_rpm, allowed_models, enabled
       FROM api_keys WHERE key_hash = $1 AND enabled = TRUE`,
      [hash]
    );
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
      id: r.id as string,
      tenantId: r.tenant_id as string,
      departmentId: (r.department_id as string) || null,
      name: r.name as string,
      plan: r.plan as ApiKey["plan"],
      rateLimitRpm: Number(r.rate_limit_rpm),
      allowedModels: (r.allowed_models as string[]) || null,
      enabled: r.enabled as boolean,
    };
  } catch {
    return null;
  }
}

function findKeyInEnv(rawKey: string): ApiKey | null {
  const envKeys = process.env.API_KEYS;
  if (!envKeys) return null;
  try {
    const keys = JSON.parse(envKeys) as Array<ApiKey & { key?: string }>;
    const found = keys.find((k) => k.key === rawKey && k.enabled);
    if (found) {
      return {
        id: found.id,
        tenantId: found.tenantId,
        departmentId: found.departmentId || null,
        name: found.name,
        plan: found.plan,
        rateLimitRpm: found.rateLimitRpm || 60,
        allowedModels: found.allowedModels || null,
        enabled: true,
      };
    }
  } catch { /* ignore parse errors */ }
  return null;
}

export async function validateApiKey(
  req: NextRequest
): Promise<{ valid: true; apiKey: ApiKey } | { valid: false; error: string }> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid Authorization header" };
  }

  const rawKey = authHeader.slice(7);

  await ensureDemoTenant();
  const dbKey = await findKeyInDb(rawKey);
  if (dbKey) return { valid: true, apiKey: dbKey };

  const envKey = findKeyInEnv(rawKey);
  if (envKey) return { valid: true, apiKey: envKey };

  return { valid: false, error: "Invalid API key" };
}

const DEMO_ALLOWED_ORIGINS = [
  "https://api.nplusstar.ai",
  "https://www.nplusstar.ai",
  "https://nplusstar.ai",
  "http://localhost:3000",
  "http://localhost",
];

function isSameOriginDemoRequest(req: NextRequest): boolean {
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  return DEMO_ALLOWED_ORIGINS.some(
    (o) => (origin && origin.startsWith(o)) || (referer && referer.startsWith(o))
  );
}

export async function validateApiKeyOrSameOriginDemo(
  req: NextRequest
): Promise<{ valid: true; apiKey: ApiKey; isDemo: boolean } | { valid: false; error: string }> {
  const result = await validateApiKey(req);
  if (result.valid) return { ...result, isDemo: false };

  if (!isSameOriginDemoRequest(req)) return result;

  const demoKey = process.env.DEMO_API_KEY;
  if (!demoKey) return result;

  await ensureDemoTenant();
  const dbKey = await findKeyInDb(demoKey);
  if (dbKey) return { valid: true, apiKey: dbKey, isDemo: true };

  return result;
}

export function checkModelPermission(
  apiKey: ApiKey,
  model: string
): boolean {
  if (!apiKey.allowedModels) return true;
  return apiKey.allowedModels.includes(model);
}

export async function createApiKey(
  tenantId: string,
  name: string,
  plan: ApiKey["plan"],
  opts?: {
    departmentId?: string;
    rateLimitRpm?: number;
    allowedModels?: string[];
  }
): Promise<{ apiKey: ApiKey; rawKey: string }> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let rawKey = "nplus_sk_";
  for (let i = 0; i < 40; i++) {
    rawKey += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12);

  const result = await query(
    `INSERT INTO api_keys (id, tenant_id, department_id, key_hash, key_prefix, name, plan, rate_limit_rpm, allowed_models, enabled, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW())
     RETURNING id, tenant_id, department_id, name, plan, rate_limit_rpm, allowed_models, enabled`,
    [
      tenantId,
      opts?.departmentId || null,
      keyHash,
      keyPrefix,
      name,
      plan,
      opts?.rateLimitRpm || 60,
      opts?.allowedModels || null,
    ]
  );

  const r = result.rows[0];
  return {
    apiKey: {
      id: r.id as string,
      tenantId: r.tenant_id as string,
      departmentId: (r.department_id as string) || null,
      name: r.name as string,
      plan: r.plan as ApiKey["plan"],
      rateLimitRpm: Number(r.rate_limit_rpm),
      allowedModels: (r.allowed_models as string[]) || null,
      enabled: true,
    },
    rawKey,
  };
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await query(`UPDATE api_keys SET enabled = FALSE WHERE id = $1`, [keyId]);
}

export async function getKeysByTenant(tenantId: string): Promise<Array<Omit<ApiKey, "enabled"> & { keyPrefix: string; enabled: boolean; createdAt: string }>> {
  const result = await query(
    `SELECT id, tenant_id, department_id, key_prefix, name, plan, rate_limit_rpm, allowed_models, enabled, created_at
     FROM api_keys WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId]
  );
  return result.rows.map((r) => ({
    id: r.id as string,
    tenantId: r.tenant_id as string,
    departmentId: (r.department_id as string) || null,
    keyPrefix: r.key_prefix as string,
    name: r.name as string,
    plan: r.plan as ApiKey["plan"],
    rateLimitRpm: Number(r.rate_limit_rpm),
    allowedModels: (r.allowed_models as string[]) || null,
    enabled: r.enabled as boolean,
    createdAt: r.created_at as string,
  }));
}

export { hashKey };
