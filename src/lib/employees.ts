import { query } from "./db";

export interface Employee {
  id: string;
  tenantId: string;
  departmentId: string;
  name: string;
  email: string | null;
  role: string;
  createdAt: string;
}

export async function getEmployeesByDepartment(departmentId: string): Promise<Employee[]> {
  const result = await query(
    `SELECT id, tenant_id, department_id, name, email, role, created_at
     FROM employees WHERE department_id = $1 ORDER BY name`,
    [departmentId]
  );
  return result.rows.map(mapRow);
}

export async function getEmployeesByTenant(tenantId: string): Promise<Employee[]> {
  const result = await query(
    `SELECT id, tenant_id, department_id, name, email, role, created_at
     FROM employees WHERE tenant_id = $1 ORDER BY name`,
    [tenantId]
  );
  return result.rows.map(mapRow);
}

export async function createEmployee(
  tenantId: string,
  departmentId: string,
  name: string,
  email: string | null,
  role: string = "member"
): Promise<Employee> {
  const result = await query(
    `INSERT INTO employees (id, tenant_id, department_id, name, email, role, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [tenantId, departmentId, name, email || null, role]
  );
  return mapRow(result.rows[0]);
}

export async function deleteEmployee(id: string, tenantId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM employees WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}

function mapRow(row: Record<string, unknown>): Employee {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    departmentId: row.department_id as string,
    name: row.name as string,
    email: (row.email as string) || null,
    role: (row.role as string) || "member",
    createdAt: row.created_at as string,
  };
}
