import { query } from "./db";

const STRIPE_API = "https://api.stripe.com/v1";

function stripeKey(): string {
  return process.env.STRIPE_SECRET_KEY || "";
}

async function stripeRequest(path: string, params?: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: params ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params ? new URLSearchParams(params).toString() : undefined,
  });
  return res.json() as Promise<Record<string, unknown>>;
}

export async function createCheckoutSession(opts: {
  currency: string;
  productName: string;
  description: string;
  unitAmount: number;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string } | { error: string }> {
  const params: Record<string, string> = {
    "payment_method_types[0]": "card",
    "line_items[0][price_data][currency]": opts.currency,
    "line_items[0][price_data][product_data][name]": opts.productName,
    "line_items[0][price_data][product_data][description]": opts.description,
    "line_items[0][price_data][unit_amount]": String(opts.unitAmount),
    "line_items[0][quantity]": "1",
    mode: "payment",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  };

  for (const [k, v] of Object.entries(opts.metadata)) {
    params[`metadata[${k}]`] = v;
  }

  const data = await stripeRequest("/checkout/sessions", params);
  if (data.error) {
    return { error: (data.error as Record<string, string>).message || "Stripe error" };
  }
  return { id: data.id as string, url: data.url as string };
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Record<string, unknown> | null {
  const crypto = require("crypto");
  const parts = signature.split(",");
  const tsEntry = parts.find((p: string) => p.startsWith("t="));
  const sigEntry = parts.find((p: string) => p.startsWith("v1="));
  if (!tsEntry || !sigEntry) return null;

  const timestamp = tsEntry.slice(2);
  const expectedSig = sigEntry.slice(3);
  const payload = `${timestamp}.${body}`;
  const computed = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  if (computed !== expectedSig) return null;

  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) return null;

  return JSON.parse(body);
}

export const CREDIT_PACKAGES = [
  { id: "credits_500", amount: 500, ntd: 500, label: "NT$500 點數包" },
  { id: "credits_1000", amount: 1000, ntd: 1000, label: "NT$1,000 點數包" },
  { id: "credits_3000", amount: 3000, ntd: 2700, label: "NT$3,000 點數包（9折）" },
  { id: "credits_5000", amount: 5000, ntd: 4000, label: "NT$5,000 點數包（8折）" },
  { id: "credits_10000", amount: 10000, ntd: 7000, label: "NT$10,000 點數包（7折）" },
] as const;

export interface CreditTransaction {
  id: string;
  tenantId: string;
  type: "purchase" | "usage" | "refund" | "bonus";
  amount: number;
  balanceAfter: number;
  description: string;
  stripeSessionId?: string;
  timestamp: string;
}

export async function getBalance(tenantId: string): Promise<number> {
  try {
    const result = await query(
      `SELECT balance FROM credit_balances WHERE tenant_id = $1`,
      [tenantId]
    );
    if (result.rows.length === 0) return 0;
    return Number(result.rows[0].balance);
  } catch {
    return 0;
  }
}

/**
 * 加點數。給 webhook 用時務必傳 stripeSessionId，靠 UNIQUE INDEX
 * (stripe_session_id) 做 atomic 防雙重發點。並發兩個同 sessionId 進來，
 * 第二個會在 INSERT 時拿到 UNIQUE conflict，回傳 alreadyProcessed。
 */
export async function addCredits(
  tenantId: string,
  amount: number,
  description: string,
  stripeSessionId?: string
): Promise<{ balance: number; alreadyProcessed: boolean }> {
  try {
    if (stripeSessionId) {
      // Step 1: 先 atomic 「鎖定」此 session — INSERT credit_transactions 含 stripe_session_id
      // 若已存在（UNIQUE 衝突）→ 表示前一個 webhook 已處理，直接回傳
      const claim = await query<{ id: string }>(
        `INSERT INTO credit_transactions
           (tenant_id, type, amount, balance_after, description, stripe_session_id)
         VALUES ($1, 'purchase', $2, 0, $3, $4)
         ON CONFLICT (stripe_session_id) WHERE stripe_session_id IS NOT NULL DO NOTHING
         RETURNING id`,
        [tenantId, amount, description, stripeSessionId]
      );
      if (claim.rows.length === 0) {
        const balance = await getBalance(tenantId);
        return { balance, alreadyProcessed: true };
      }
      const txId = claim.rows[0].id;

      // Step 2: balance += amount
      const balResult = await query<{ balance: string }>(
        `INSERT INTO credit_balances (tenant_id, balance, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (tenant_id) DO UPDATE
         SET balance = credit_balances.balance + $2, updated_at = NOW()
         RETURNING balance`,
        [tenantId, amount]
      );
      const newBalance = Number(balResult.rows[0].balance);

      // Step 3: 補上正確的 balance_after
      await query(
        `UPDATE credit_transactions SET balance_after = $1 WHERE id = $2`,
        [newBalance, txId]
      );

      return { balance: newBalance, alreadyProcessed: false };
    }

    // 非 webhook 路徑（手動加點 / bonus）：沒 sessionId 不走 idempotency
    const balResult = await query<{ balance: string }>(
      `INSERT INTO credit_balances (tenant_id, balance, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET balance = credit_balances.balance + $2, updated_at = NOW()
       RETURNING balance`,
      [tenantId, amount]
    );
    const newBalance = Number(balResult.rows[0].balance);

    await query(
      `INSERT INTO credit_transactions (tenant_id, type, amount, balance_after, description, stripe_session_id)
       VALUES ($1, 'purchase', $2, $3, $4, NULL)`,
      [tenantId, amount, newBalance, description]
    );

    return { balance: newBalance, alreadyProcessed: false };
  } catch (err) {
    console.error("[stripe] addCredits error:", err);
    return { balance: 0, alreadyProcessed: false };
  }
}

export async function deductCredits(tenantId: string, amount: number, description: string): Promise<{ success: boolean; balance: number }> {
  try {
    const current = await getBalance(tenantId);
    if (current < amount) {
      return { success: false, balance: current };
    }

    const result = await query(
      `UPDATE credit_balances SET balance = balance - $1, updated_at = NOW()
       WHERE tenant_id = $2 AND balance >= $1
       RETURNING balance`,
      [amount, tenantId]
    );
    if (result.rows.length === 0) {
      return { success: false, balance: current };
    }

    const newBalance = Number(result.rows[0].balance);

    await query(
      `INSERT INTO credit_transactions (tenant_id, type, amount, balance_after, description)
       VALUES ($1, 'usage', $2, $3, $4)`,
      [tenantId, -amount, newBalance, description]
    );

    return { success: true, balance: newBalance };
  } catch (err) {
    console.error("[stripe] deductCredits error:", err);
    return { success: false, balance: 0 };
  }
}

export async function getCreditTransactions(tenantId: string): Promise<CreditTransaction[]> {
  try {
    const result = await query(
      `SELECT id, tenant_id, type, amount, balance_after, description, stripe_session_id, created_at
       FROM credit_transactions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [tenantId]
    );
    return result.rows.map((r) => ({
      id: r.id as string,
      tenantId: r.tenant_id as string,
      type: r.type as CreditTransaction["type"],
      amount: Number(r.amount),
      balanceAfter: Number(r.balance_after),
      description: (r.description as string) || "",
      stripeSessionId: (r.stripe_session_id as string) || undefined,
      timestamp: String(r.created_at),
    }));
  } catch {
    return [];
  }
}

/**
 * 給 webhook 預檢用（避免「已處理」case 跑下游 metadata 解析）。
 * 真正的 atomic 防雙重發點在 addCredits 裡（UNIQUE INDEX + ON CONFLICT）。
 */
export async function isSessionProcessed(sessionId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT id FROM credit_transactions WHERE stripe_session_id = $1 LIMIT 1`,
      [sessionId]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}
