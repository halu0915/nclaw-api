/**
 * Usage tracking: records API calls, queries usage, billing summaries.
 *
 * Storage strategy:
 *   - When DATABASE_URL is set  -> PostgreSQL (persistent)
 *   - Otherwise                 -> in-memory Map (resets on cold start, MVP fallback)
 */

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export interface UsageRecord {
  id: string;
  timestamp: string;
  tenantId: string;
  apiKeyId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  billedNtd: number;
  latencyMs: number;
  status: "success" | "error";
  // Extended fields (optional for backward compat)
  departmentId?: string;
  provider?: string;
  cachedTokens?: number;
  errorMessage?: string;
}

export interface UsageFilters {
  tenantId?: string;
  apiKeyId?: string;
  departmentId?: string;
  model?: string;
  status?: "success" | "error";
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface MonthlySummary {
  tenantId: string;
  year: number;
  month: number;
  totalRequests: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedTokens: number;
  totalCostUsd: number;
  totalBilledNtd: number;
  avgLatencyMs: number;
  byModel: Record<string, { requests: number; tokens: number; costUsd: number; billedNtd: number }>;
}

// ────────────────────────────────────────────────────────────────
// DB detection
// ────────────────────────────────────────────────────────────────

function hasDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

async function getDb() {
  // Dynamic import so the module works even when ./db doesn't exist yet
  const { query } = await import("./db");
  return query;
}

// ────────────────────────────────────────────────────────────────
// In-memory fallback store
// ────────────────────────────────────────────────────────────────

const MAX_IN_MEMORY = 10_000;
const memoryRecords: UsageRecord[] = [];

// ────────────────────────────────────────────────────────────────
// recordUsage
// ────────────────────────────────────────────────────────────────

export async function recordUsage(record: UsageRecord): Promise<void> {
  if (hasDatabase()) {
    try {
      const query = await getDb();
      await query(
        `INSERT INTO usage_logs (
          id, tenant_id, api_key_id, department_id, model, provider,
          input_tokens, output_tokens, cached_tokens, total_tokens,
          cost_usd, billed_ntd, latency_ms, status, error_message, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16
        )`,
        [
          record.id,
          record.tenantId,
          record.apiKeyId,
          record.departmentId ?? null,
          record.model,
          record.provider ?? null,
          record.inputTokens,
          record.outputTokens,
          record.cachedTokens ?? 0,
          record.totalTokens,
          record.costUsd,
          record.billedNtd,
          record.latencyMs,
          record.status,
          record.errorMessage ?? null,
          record.timestamp,
        ]
      );
      return;
    } catch (err) {
      // DB write failed — fall through to in-memory as safety net
      console.error("[usage] DB write failed, falling back to memory:", err);
    }
  }

  // In-memory fallback
  memoryRecords.push(record);
  if (memoryRecords.length > MAX_IN_MEMORY) {
    memoryRecords.splice(0, memoryRecords.length - MAX_IN_MEMORY);
  }
}

// ────────────────────────────────────────────────────────────────
// getUsage
// ────────────────────────────────────────────────────────────────

export async function getUsage(filters?: UsageFilters): Promise<UsageRecord[]> {
  if (hasDatabase()) {
    try {
      const query = await getDb();
      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (filters?.tenantId) {
        conditions.push(`tenant_id = $${idx++}`);
        params.push(filters.tenantId);
      }
      if (filters?.apiKeyId) {
        conditions.push(`api_key_id = $${idx++}`);
        params.push(filters.apiKeyId);
      }
      if (filters?.departmentId) {
        conditions.push(`department_id = $${idx++}`);
        params.push(filters.departmentId);
      }
      if (filters?.model) {
        conditions.push(`model = $${idx++}`);
        params.push(filters.model);
      }
      if (filters?.status) {
        conditions.push(`status = $${idx++}`);
        params.push(filters.status);
      }
      if (filters?.startDate) {
        conditions.push(`created_at >= $${idx++}`);
        params.push(filters.startDate);
      }
      if (filters?.endDate) {
        conditions.push(`created_at <= $${idx++}`);
        params.push(filters.endDate);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const limit = filters?.limit ?? 1000;
      const offset = filters?.offset ?? 0;

      const sql = `
        SELECT id, tenant_id, api_key_id, department_id, model, provider,
               input_tokens, output_tokens, cached_tokens, total_tokens,
               cost_usd, billed_ntd, latency_ms, status, error_message, created_at
        FROM usage_logs
        ${where}
        ORDER BY created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `;
      params.push(limit, offset);

      const result = await query(sql, params);
      return result.rows.map(rowToRecord);
    } catch (err) {
      console.error("[usage] DB read failed, falling back to memory:", err);
    }
  }

  // In-memory fallback
  return filterMemoryRecords(filters);
}

// ────────────────────────────────────────────────────────────────
// getMonthlyBilling
// ────────────────────────────────────────────────────────────────

export async function getMonthlyBilling(
  tenantId: string,
  year: number,
  month: number
): Promise<MonthlySummary> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01T00:00:00.000Z`;

  if (hasDatabase()) {
    try {
      const query = await getDb();

      const summaryResult = await query(
        `SELECT
           COUNT(*)::int AS total_requests,
           COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens,
           COALESCE(SUM(input_tokens), 0)::bigint AS total_input_tokens,
           COALESCE(SUM(output_tokens), 0)::bigint AS total_output_tokens,
           COALESCE(SUM(cached_tokens), 0)::bigint AS total_cached_tokens,
           COALESCE(SUM(cost_usd), 0)::float AS total_cost_usd,
           COALESCE(SUM(billed_ntd), 0)::float AS total_billed_ntd,
           COALESCE(AVG(latency_ms), 0)::float AS avg_latency_ms
         FROM usage_logs
         WHERE tenant_id = $1
           AND created_at >= $2
           AND created_at < $3`,
        [tenantId, startDate, endDate]
      );

      const byModelResult = await query(
        `SELECT model,
                COUNT(*)::int AS requests,
                COALESCE(SUM(total_tokens), 0)::bigint AS tokens,
                COALESCE(SUM(cost_usd), 0)::float AS cost_usd,
                COALESCE(SUM(billed_ntd), 0)::float AS billed_ntd
         FROM usage_logs
         WHERE tenant_id = $1
           AND created_at >= $2
           AND created_at < $3
         GROUP BY model`,
        [tenantId, startDate, endDate]
      );

      const row = summaryResult.rows[0];
      const byModel: MonthlySummary["byModel"] = {};
      for (const m of byModelResult.rows) {
        byModel[m.model] = {
          requests: Number(m.requests),
          tokens: Number(m.tokens),
          costUsd: Number(m.cost_usd),
          billedNtd: Number(m.billed_ntd),
        };
      }

      return {
        tenantId,
        year,
        month,
        totalRequests: Number(row.total_requests),
        totalTokens: Number(row.total_tokens),
        totalInputTokens: Number(row.total_input_tokens),
        totalOutputTokens: Number(row.total_output_tokens),
        totalCachedTokens: Number(row.total_cached_tokens),
        totalCostUsd: Math.round(Number(row.total_cost_usd) * 10000) / 10000,
        totalBilledNtd: Math.round(Number(row.total_billed_ntd) * 100) / 100,
        avgLatencyMs: Math.round(Number(row.avg_latency_ms)),
        byModel,
      };
    } catch (err) {
      console.error("[usage] DB monthly billing failed, falling back to memory:", err);
    }
  }

  // In-memory fallback
  const records = filterMemoryRecords({
    tenantId,
    startDate,
    endDate,
  });

  return buildMonthlySummaryFromRecords(tenantId, year, month, records);
}

// ────────────────────────────────────────────────────────────────
// checkBudget
// ────────────────────────────────────────────────────────────────

export async function checkBudget(
  tenantId: string
): Promise<{ exceeded: boolean; usedNtd: number; budgetNtd: number }> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (hasDatabase()) {
    try {
      const query = await getDb();

      // Get tenant budget
      const tenantResult = await query(
        `SELECT monthly_budget_ntd FROM tenants WHERE id = $1`,
        [tenantId]
      );

      if (tenantResult.rows.length === 0) {
        return { exceeded: false, usedNtd: 0, budgetNtd: 0 };
      }

      const budgetNtd = Number(tenantResult.rows[0].monthly_budget_ntd) || 0;

      if (budgetNtd <= 0) {
        // No budget cap set
        return { exceeded: false, usedNtd: 0, budgetNtd: 0 };
      }

      // Get current month spend
      const startDate = `${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`;
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01T00:00:00.000Z`;

      const usageResult = await query(
        `SELECT COALESCE(SUM(billed_ntd), 0)::float AS used_ntd
         FROM usage_logs
         WHERE tenant_id = $1
           AND created_at >= $2
           AND created_at < $3`,
        [tenantId, startDate, endDate]
      );

      const usedNtd = Math.round(Number(usageResult.rows[0].used_ntd) * 100) / 100;

      return {
        exceeded: usedNtd >= budgetNtd,
        usedNtd,
        budgetNtd,
      };
    } catch (err) {
      console.error("[usage] DB budget check failed:", err);
    }
  }

  // In-memory fallback: no budget enforcement without DB
  const summary = await getMonthlyBilling(tenantId, year, month);
  return {
    exceeded: false,
    usedNtd: summary.totalBilledNtd,
    budgetNtd: 0,
  };
}

// ────────────────────────────────────────────────────────────────
// getUsageSummary (backward compat for admin route)
// ────────────────────────────────────────────────────────────────

export async function getUsageSummary(tenantId?: string) {
  const records = await getUsage(tenantId ? { tenantId } : undefined);

  const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
  const totalCostUsd = records.reduce((sum, r) => sum + r.costUsd, 0);
  const totalBilledNtd = records.reduce((sum, r) => sum + r.billedNtd, 0);
  const totalRequests = records.length;
  const avgLatency =
    records.length > 0
      ? records.reduce((sum, r) => sum + r.latencyMs, 0) / records.length
      : 0;

  const byModel: Record<string, { requests: number; tokens: number; costUsd: number }> = {};
  for (const r of records) {
    if (!byModel[r.model]) {
      byModel[r.model] = { requests: 0, tokens: 0, costUsd: 0 };
    }
    byModel[r.model].requests++;
    byModel[r.model].tokens += r.totalTokens;
    byModel[r.model].costUsd += r.costUsd;
  }

  return {
    totalRequests,
    totalTokens,
    totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
    totalBilledNtd: Math.round(totalBilledNtd),
    profit: Math.round((totalBilledNtd - totalCostUsd * 32) * 100) / 100,
    avgLatencyMs: Math.round(avgLatency),
    byModel,
  };
}

// ────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────

function rowToRecord(row: Record<string, unknown>): UsageRecord {
  return {
    id: String(row.id),
    timestamp: String(row.created_at),
    tenantId: String(row.tenant_id),
    apiKeyId: String(row.api_key_id),
    departmentId: row.department_id ? String(row.department_id) : undefined,
    model: String(row.model),
    provider: row.provider ? String(row.provider) : undefined,
    inputTokens: Number(row.input_tokens),
    outputTokens: Number(row.output_tokens),
    cachedTokens: Number(row.cached_tokens) || 0,
    totalTokens: Number(row.total_tokens),
    costUsd: Number(row.cost_usd),
    billedNtd: Number(row.billed_ntd),
    latencyMs: Number(row.latency_ms),
    status: row.status === "error" ? "error" : "success",
    errorMessage: row.error_message ? String(row.error_message) : undefined,
  };
}

function filterMemoryRecords(filters?: UsageFilters): UsageRecord[] {
  let records = [...memoryRecords];

  if (filters?.tenantId) {
    records = records.filter((r) => r.tenantId === filters.tenantId);
  }
  if (filters?.apiKeyId) {
    records = records.filter((r) => r.apiKeyId === filters.apiKeyId);
  }
  if (filters?.departmentId) {
    records = records.filter((r) => r.departmentId === filters.departmentId);
  }
  if (filters?.model) {
    records = records.filter((r) => r.model === filters.model);
  }
  if (filters?.status) {
    records = records.filter((r) => r.status === filters.status);
  }
  if (filters?.startDate) {
    records = records.filter((r) => r.timestamp >= filters.startDate!);
  }
  if (filters?.endDate) {
    records = records.filter((r) => r.timestamp <= filters.endDate!);
  }

  // Sort descending by timestamp for consistency with DB path
  records.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));

  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? 1000;
  return records.slice(offset, offset + limit);
}

function buildMonthlySummaryFromRecords(
  tenantId: string,
  year: number,
  month: number,
  records: UsageRecord[]
): MonthlySummary {
  const byModel: MonthlySummary["byModel"] = {};

  let totalTokens = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCachedTokens = 0;
  let totalCostUsd = 0;
  let totalBilledNtd = 0;
  let totalLatency = 0;

  for (const r of records) {
    totalTokens += r.totalTokens;
    totalInputTokens += r.inputTokens;
    totalOutputTokens += r.outputTokens;
    totalCachedTokens += r.cachedTokens ?? 0;
    totalCostUsd += r.costUsd;
    totalBilledNtd += r.billedNtd;
    totalLatency += r.latencyMs;

    if (!byModel[r.model]) {
      byModel[r.model] = { requests: 0, tokens: 0, costUsd: 0, billedNtd: 0 };
    }
    byModel[r.model].requests++;
    byModel[r.model].tokens += r.totalTokens;
    byModel[r.model].costUsd += r.costUsd;
    byModel[r.model].billedNtd += r.billedNtd;
  }

  return {
    tenantId,
    year,
    month,
    totalRequests: records.length,
    totalTokens,
    totalInputTokens,
    totalOutputTokens,
    totalCachedTokens,
    totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
    totalBilledNtd: Math.round(totalBilledNtd * 100) / 100,
    avgLatencyMs: records.length > 0 ? Math.round(totalLatency / records.length) : 0,
    byModel,
  };
}
