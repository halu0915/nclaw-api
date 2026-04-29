import crypto from "crypto";
import { query } from "./db";
import { DEMO_TENANT_ID, ensureDemoTenant } from "./tenant";

export interface Customer {
  id: string;
  email: string;
  passwordHash: string;
  companyName: string;
  contactName: string;
  phone: string;
  plan: "free" | "developer" | "light" | "standard" | "pro" | "enterprise";
  apiKey: string;
  status: "active" | "suspended" | "trial";
  tokenQuota: number;
  tokensUsed: number;
  createdAt: string;
  trialEndsAt: string;
  tenantId: string | null;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const verify = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === verify;
}

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "nplus_sk_";
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Customer session token：HMAC-SHA256 簽名防偽造。
// 格式：base64url(payload).base64url(sig) — 兩段以 "." 分隔
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

function getTokenSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET env missing or too short (min 16 chars)");
  }
  return secret;
}

function sign(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

// timing-safe 比對，避免 timing attack
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function generateToken(customerId: string): string {
  const secret = getTokenSecret();
  const payload = Buffer.from(
    JSON.stringify({ id: customerId, ts: Date.now() })
  ).toString("base64url");
  const sig = sign(payload, secret);
  return `${payload}.${sig}`;
}

function verifyToken(token: string): string | null {
  try {
    const secret = getTokenSecret();
    const dotIndex = token.indexOf(".");
    if (dotIndex < 0) return null;
    const payload = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    if (!payload || !sig) return null;

    const expected = sign(payload, secret);
    if (!timingSafeEqual(sig, expected)) return null;

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!parsed.id || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts >= TOKEN_TTL_MS) return null;

    return parsed.id;
  } catch {
    return null;
  }
}

const PLAN_QUOTAS: Record<string, number> = {
  free: 1_000_000,
  developer: 999_999_999,
  light: 1_000_000,
  standard: 5_000_000,
  pro: 20_000_000,
  enterprise: 999_999_999,
};

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  developer: 0,
  light: 2990,
  standard: 9900,
  pro: 29900,
  enterprise: 0,
};

function rowToCustomer(r: Record<string, unknown>): Customer {
  return {
    id: r.id as string,
    email: r.email as string,
    passwordHash: r.password_hash as string,
    companyName: (r.company_name as string) || "",
    contactName: (r.contact_name as string) || "",
    phone: (r.phone as string) || "",
    plan: (r.plan as Customer["plan"]) || "free",
    apiKey: (r.api_key as string) || "",
    status: (r.status as Customer["status"]) || "trial",
    tokenQuota: Number(r.token_quota) || PLAN_QUOTAS.free,
    tokensUsed: Number(r.tokens_used) || 0,
    createdAt: r.created_at ? String(r.created_at) : new Date().toISOString(),
    trialEndsAt: r.trial_ends_at ? String(r.trial_ends_at) : new Date().toISOString(),
    tenantId: (r.tenant_id as string) || null,
  };
}

const CUSTOMER_COLS = `id, tenant_id, email, password_hash, company_name, contact_name, phone, plan, api_key, status, token_quota, tokens_used, created_at, trial_ends_at`;

export async function registerCustomer(data: {
  email: string;
  password: string;
  companyName: string;
  contactName: string;
  phone: string;
}): Promise<{ customer: Customer; token: string } | { error: string }> {
  try {
    const existing = await query(
      `SELECT id FROM customers WHERE email = $1`,
      [data.email]
    );
    if (existing.rows.length > 0) {
      return { error: "此 Email 已註冊" };
    }

    await ensureDemoTenant();

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const result = await query(
      `INSERT INTO customers (tenant_id, email, password_hash, company_name, contact_name, phone, plan, api_key, status, token_quota, tokens_used, trial_ends_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, $11)
       RETURNING ${CUSTOMER_COLS}`,
      [
        DEMO_TENANT_ID,
        data.email,
        hashPassword(data.password),
        data.companyName,
        data.contactName,
        data.phone,
        "free",
        generateApiKey(),
        "trial",
        PLAN_QUOTAS.free,
        trialEnd.toISOString(),
      ]
    );

    const customer = rowToCustomer(result.rows[0]);
    const token = generateToken(customer.id);
    return { customer, token };
  } catch (err) {
    console.error("[customers] registerCustomer error:", err);
    return { error: "註冊失敗，請稍後再試" };
  }
}

export async function loginCustomer(email: string, password: string): Promise<{ customer: Customer; token: string } | { error: string }> {
  try {
    const result = await query(
      `SELECT ${CUSTOMER_COLS} FROM customers WHERE email = $1`,
      [email]
    );
    if (result.rows.length === 0) {
      return { error: "帳號不存在" };
    }
    const customer = rowToCustomer(result.rows[0]);
    if (!verifyPassword(password, customer.passwordHash)) {
      return { error: "密碼錯誤" };
    }
    const token = generateToken(customer.id);
    return { customer, token };
  } catch (err) {
    console.error("[customers] loginCustomer error:", err);
    return { error: "登入失敗，請稍後再試" };
  }
}

export async function getCustomerByToken(token: string): Promise<Customer | null> {
  const id = verifyToken(token);
  if (!id) return null;
  try {
    const result = await query(
      `SELECT ${CUSTOMER_COLS} FROM customers WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    return rowToCustomer(result.rows[0]);
  } catch {
    return null;
  }
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  try {
    const result = await query(
      `SELECT ${CUSTOMER_COLS} FROM customers WHERE email = $1`,
      [email]
    );
    if (result.rows.length === 0) return null;
    return rowToCustomer(result.rows[0]);
  } catch {
    return null;
  }
}

export async function updatePlan(customerId: string, plan: Customer["plan"]): Promise<Customer | null> {
  try {
    const quota = PLAN_QUOTAS[plan] || PLAN_QUOTAS.free;
    const result = await query(
      `UPDATE customers SET plan = $1, token_quota = $2, status = 'active' WHERE id = $3 RETURNING ${CUSTOMER_COLS}`,
      [plan, quota, customerId]
    );
    if (result.rows.length === 0) return null;
    return rowToCustomer(result.rows[0]);
  } catch {
    return null;
  }
}

export function getCustomerPublic(c: Customer) {
  return {
    id: c.id,
    email: c.email,
    companyName: c.companyName,
    contactName: c.contactName,
    phone: c.phone,
    plan: c.plan,
    apiKey: c.apiKey,
    status: c.status,
    tokenQuota: c.tokenQuota,
    tokensUsed: c.tokensUsed,
    createdAt: c.createdAt,
    trialEndsAt: c.trialEndsAt,
    planPrice: PLAN_PRICES[c.plan] || 0,
  };
}

export { PLAN_PRICES, PLAN_QUOTAS };
