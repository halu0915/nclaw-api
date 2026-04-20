import crypto from "crypto";

export interface Customer {
  id: string;
  email: string;
  passwordHash: string;
  companyName: string;
  contactName: string;
  phone: string;
  plan: "free" | "light" | "standard" | "pro" | "enterprise";
  apiKey: string;
  status: "active" | "suspended" | "trial";
  tokenQuota: number;
  tokensUsed: number;
  createdAt: string;
  trialEndsAt: string;
}

// In-memory store (MVP — migrate to PostgreSQL in Phase 2)
const customers = new Map<string, Customer>();

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

function generateToken(customerId: string): string {
  const payload = { id: customerId, ts: Date.now() };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function verifyToken(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64url").toString());
    if (payload.id && Date.now() - payload.ts < 7 * 24 * 60 * 60 * 1000) {
      return payload.id;
    }
    return null;
  } catch {
    return null;
  }
}

const PLAN_QUOTAS: Record<string, number> = {
  free: 100_000,
  light: 1_000_000,
  standard: 5_000_000,
  pro: 20_000_000,
  enterprise: 999_999_999,
};

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  light: 2990,
  standard: 9900,
  pro: 29900,
  enterprise: 0,
};

export function registerCustomer(data: {
  email: string;
  password: string;
  companyName: string;
  contactName: string;
  phone: string;
}): { customer: Customer; token: string } | { error: string } {
  // Check duplicate email
  for (const c of customers.values()) {
    if (c.email === data.email) {
      return { error: "此 Email 已註冊" };
    }
  }

  const id = crypto.randomUUID();
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  const customer: Customer = {
    id,
    email: data.email,
    passwordHash: hashPassword(data.password),
    companyName: data.companyName,
    contactName: data.contactName,
    phone: data.phone,
    plan: "free",
    apiKey: generateApiKey(),
    status: "trial",
    tokenQuota: PLAN_QUOTAS.free,
    tokensUsed: 0,
    createdAt: new Date().toISOString(),
    trialEndsAt: trialEnd.toISOString(),
  };

  customers.set(id, customer);
  const token = generateToken(id);
  return { customer, token };
}

export function loginCustomer(email: string, password: string): { customer: Customer; token: string } | { error: string } {
  for (const c of customers.values()) {
    if (c.email === email) {
      if (verifyPassword(password, c.passwordHash)) {
        const token = generateToken(c.id);
        return { customer: c, token };
      }
      return { error: "密碼錯誤" };
    }
  }
  return { error: "帳號不存在" };
}

export function getCustomerByToken(token: string): Customer | null {
  const id = verifyToken(token);
  if (!id) return null;
  return customers.get(id) || null;
}

export function updatePlan(customerId: string, plan: Customer["plan"]): Customer | null {
  const customer = customers.get(customerId);
  if (!customer) return null;

  customer.plan = plan;
  customer.tokenQuota = PLAN_QUOTAS[plan] || PLAN_QUOTAS.free;
  customer.status = "active";
  customers.set(customerId, customer);
  return customer;
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
