import { query } from "./db";

export interface BillingPeriod {
  id: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  totalBilledNtd: number;
  status: "draft" | "sent" | "paid";
  invoiceNumber: string | null;
  createdAt: string;
}

export interface MonthlyBreakdown {
  model: string;
  provider: string;
  requests: number;
  totalTokens: number;
  costUsd: number;
  billedNtd: number;
}

export async function generateMonthlyBilling(
  tenantId: string,
  year: number,
  month: number
): Promise<BillingPeriod> {
  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const existing = await query(
    `SELECT * FROM billing_periods WHERE tenant_id = $1 AND period_start = $2`,
    [tenantId, periodStart]
  );
  if (existing.rows.length > 0) {
    return mapBillingRow(existing.rows[0]);
  }

  const stats = await query(
    `SELECT
       COUNT(*)::int AS total_requests,
       COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens,
       COALESCE(SUM(cost_usd), 0)::numeric AS total_cost_usd,
       COALESCE(SUM(billed_ntd), 0)::numeric AS total_billed_ntd
     FROM usage_logs
     WHERE tenant_id = $1 AND created_at >= $2 AND created_at < $3`,
    [tenantId, periodStart, periodEnd]
  );

  const s = stats.rows[0];
  const invoiceNumber = `INV-${year}${String(month).padStart(2, "0")}-${tenantId.slice(0, 8).toUpperCase()}`;

  const result = await query(
    `INSERT INTO billing_periods (id, tenant_id, period_start, period_end, total_requests, total_tokens, total_cost_usd, total_billed_ntd, status, invoice_number, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'draft', $8, NOW())
     RETURNING *`,
    [
      tenantId,
      periodStart,
      periodEnd,
      s.total_requests,
      s.total_tokens,
      s.total_cost_usd,
      s.total_billed_ntd,
      invoiceNumber,
    ]
  );

  return mapBillingRow(result.rows[0]);
}

export async function getMonthlyBreakdown(
  tenantId: string,
  year: number,
  month: number
): Promise<MonthlyBreakdown[]> {
  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const result = await query(
    `SELECT
       model, provider,
       COUNT(*)::int AS requests,
       SUM(total_tokens)::bigint AS total_tokens,
       SUM(cost_usd)::numeric AS cost_usd,
       SUM(billed_ntd)::numeric AS billed_ntd
     FROM usage_logs
     WHERE tenant_id = $1 AND created_at >= $2 AND created_at < $3
     GROUP BY model, provider
     ORDER BY billed_ntd DESC`,
    [tenantId, periodStart, periodEnd]
  );

  return result.rows.map((r) => ({
    model: r.model as string,
    provider: r.provider as string,
    requests: Number(r.requests),
    totalTokens: Number(r.total_tokens),
    costUsd: Number(r.cost_usd),
    billedNtd: Number(r.billed_ntd),
  }));
}

export async function getBillingHistory(tenantId: string): Promise<BillingPeriod[]> {
  const result = await query(
    `SELECT * FROM billing_periods WHERE tenant_id = $1 ORDER BY period_start DESC`,
    [tenantId]
  );
  return result.rows.map(mapBillingRow);
}

export async function updateBillingStatus(
  billingId: string,
  status: "draft" | "sent" | "paid"
): Promise<void> {
  await query(`UPDATE billing_periods SET status = $1 WHERE id = $2`, [status, billingId]);
}

function mapBillingRow(row: Record<string, unknown>): BillingPeriod {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    totalRequests: Number(row.total_requests),
    totalTokens: Number(row.total_tokens),
    totalCostUsd: Number(row.total_cost_usd),
    totalBilledNtd: Number(row.total_billed_ntd),
    status: row.status as BillingPeriod["status"],
    invoiceNumber: row.invoice_number as string | null,
    createdAt: row.created_at as string,
  };
}
