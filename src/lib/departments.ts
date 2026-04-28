import { query } from "./db";

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  monthlyQuotaTokens: number;
  tokensUsedThisMonth: number;
  createdAt: string;
}

export async function getDepartments(tenantId: string): Promise<Department[]> {
  const result = await query(
    `SELECT id, tenant_id, name, monthly_quota_tokens, tokens_used_this_month, created_at
     FROM departments WHERE tenant_id = $1 ORDER BY name`,
    [tenantId]
  );
  return result.rows.map(mapRow);
}

export async function createDepartment(
  tenantId: string,
  name: string,
  monthlyQuotaTokens: number
): Promise<Department> {
  const result = await query(
    `INSERT INTO departments (id, tenant_id, name, monthly_quota_tokens, tokens_used_this_month, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 0, NOW())
     RETURNING *`,
    [tenantId, name, monthlyQuotaTokens]
  );
  return mapRow(result.rows[0]);
}

export async function checkDepartmentQuota(
  departmentId: string
): Promise<{ allowed: boolean; used: number; quota: number }> {
  const result = await query(
    `SELECT monthly_quota_tokens, tokens_used_this_month FROM departments WHERE id = $1`,
    [departmentId]
  );
  if (result.rows.length === 0) {
    return { allowed: true, used: 0, quota: 0 };
  }
  const row = result.rows[0];
  const quota = Number(row.monthly_quota_tokens);
  const used = Number(row.tokens_used_this_month);
  return {
    allowed: quota === 0 || used < quota,
    used,
    quota,
  };
}

export async function incrementDepartmentUsage(
  departmentId: string,
  tokens: number
): Promise<void> {
  await query(
    `UPDATE departments SET tokens_used_this_month = tokens_used_this_month + $1 WHERE id = $2`,
    [tokens, departmentId]
  );
}

export async function resetMonthlyUsage(): Promise<void> {
  await query(`UPDATE departments SET tokens_used_this_month = 0`, []);
}

function mapRow(row: Record<string, unknown>): Department {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    monthlyQuotaTokens: Number(row.monthly_quota_tokens),
    tokensUsedThisMonth: Number(row.tokens_used_this_month),
    createdAt: row.created_at as string,
  };
}
