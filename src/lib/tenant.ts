import { query } from "./db";
import crypto from "crypto";

export const DEMO_TENANT_ID = "a0000000-0000-4000-8000-000000000001";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// 種子 key 來源於環境變數。無對應 env 時略過（不再使用寫死 fallback，避免 secrets 入 git history）。
const SEED_KEY_DEFINITIONS = [
  { envVar: "DEMO_API_KEY", name: "Internal Test Key", plan: "enterprise", rpm: 500 },
  { envVar: "PARTNER_API_KEY", name: "Partner Unlimited Trial", plan: "enterprise", rpm: 500 },
];

const SEED_KEYS = SEED_KEY_DEFINITIONS
  .filter((def) => process.env[def.envVar])
  .map((def) => ({
    raw: process.env[def.envVar]!,
    name: def.name,
    plan: def.plan,
    rpm: def.rpm,
  }));

let ensured = false;

export async function ensureDemoTenant(): Promise<void> {
  if (ensured) return;
  try {
    await query(
      `INSERT INTO tenants (id, name, plan, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [DEMO_TENANT_ID, "N+Claw Demo", "free", "active"]
    );
    await query(`
      CREATE TABLE IF NOT EXISTS employees (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        department_id   UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
        name            TEXT NOT NULL,
        email           TEXT,
        role            TEXT NOT NULL DEFAULT 'member',
        created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS customers (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
        email           TEXT UNIQUE NOT NULL,
        password_hash   TEXT NOT NULL,
        company_name    TEXT NOT NULL DEFAULT '',
        contact_name    TEXT NOT NULL DEFAULT '',
        phone           TEXT NOT NULL DEFAULT '',
        plan            TEXT NOT NULL DEFAULT 'free',
        api_key         TEXT,
        status          TEXT NOT NULL DEFAULT 'trial',
        token_quota     BIGINT NOT NULL DEFAULT 1000000,
        tokens_used     BIGINT NOT NULL DEFAULT 0,
        trial_ends_at   TIMESTAMP WITH TIME ZONE,
        created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS credit_balances (
        tenant_id       UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
        balance         NUMERIC NOT NULL DEFAULT 0,
        updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        type              TEXT NOT NULL,
        amount            NUMERIC NOT NULL,
        balance_after     NUMERIC NOT NULL,
        description       TEXT NOT NULL DEFAULT '',
        stripe_session_id TEXT,
        created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    // 防 Stripe webhook retry 雙重發點：同一 stripe_session_id 只能落一筆 purchase
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_stripe_session_id_unique
        ON credit_transactions (stripe_session_id)
        WHERE stripe_session_id IS NOT NULL
    `);

    for (const seed of SEED_KEYS) {
      const hash = hashKey(seed.raw);
      const prefix = seed.raw.slice(0, 12);
      const exists = await query(
        `SELECT id FROM api_keys WHERE key_hash = $1`,
        [hash]
      );
      if (exists.rows.length === 0) {
        await query(
          `INSERT INTO api_keys (tenant_id, key_hash, key_prefix, name, plan, rate_limit_rpm, enabled)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
          [DEMO_TENANT_ID, hash, prefix, seed.name, seed.plan, seed.rpm]
        );
      }
    }

    ensured = true;
  } catch (e) {
    console.error("[tenant] ensureDemoTenant error:", e);
  }
}
