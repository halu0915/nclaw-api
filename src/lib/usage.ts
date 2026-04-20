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
}

// In-memory usage store (resets on cold start — MVP only)
// Phase 2: migrate to PostgreSQL
const usageRecords: UsageRecord[] = [];

export function recordUsage(record: UsageRecord) {
  usageRecords.push(record);
  // Keep max 10000 records in memory
  if (usageRecords.length > 10000) {
    usageRecords.splice(0, usageRecords.length - 10000);
  }
}

export function getUsage(filters?: {
  tenantId?: string;
  startDate?: string;
  endDate?: string;
}): UsageRecord[] {
  let records = [...usageRecords];

  if (filters?.tenantId) {
    records = records.filter((r) => r.tenantId === filters.tenantId);
  }
  if (filters?.startDate) {
    records = records.filter((r) => r.timestamp >= filters.startDate!);
  }
  if (filters?.endDate) {
    records = records.filter((r) => r.timestamp <= filters.endDate!);
  }

  return records;
}

export function getUsageSummary(tenantId?: string) {
  const records = tenantId
    ? getUsage({ tenantId })
    : [...usageRecords];

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
