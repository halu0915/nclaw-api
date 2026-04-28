import { query } from "./db";

const TAX_RATE = 0.05; // 台灣營業稅 5%

export interface Invoice {
  id: string;
  billingPeriodId: string;
  tenantId: string;
  invoiceNumber: string;
  taxId: string | null;
  companyName: string;
  amountNtd: number;
  taxNtd: number;
  totalNtd: number;
  pdfUrl: string | null;
  status: "draft" | "issued" | "paid" | "voided";
  issuedAt: string | null;
  createdAt: string;
}

export async function createInvoice(
  billingPeriodId: string,
  tenantId: string
): Promise<Invoice> {
  const tenant = await query(
    `SELECT name, tax_id FROM tenants WHERE id = $1`,
    [tenantId]
  );
  if (tenant.rows.length === 0) throw new Error("Tenant not found");

  const billing = await query(
    `SELECT total_billed_ntd, invoice_number FROM billing_periods WHERE id = $1`,
    [billingPeriodId]
  );
  if (billing.rows.length === 0) throw new Error("Billing period not found");

  const t = tenant.rows[0];
  const b = billing.rows[0];
  const taxId = t.tax_id as string | null;
  const companyName = t.name as string;
  const totalBilled = Number(b.total_billed_ntd);
  const invoiceNumber = b.invoice_number as string;

  let amountNtd: number;
  let taxNtd: number;
  let totalNtd: number;

  if (taxId) {
    // B2B: 含稅拆分 — 金額 + 5% 稅
    amountNtd = Math.round(totalBilled / (1 + TAX_RATE));
    taxNtd = totalBilled - amountNtd;
    totalNtd = totalBilled;
  } else {
    // B2C: 稅內含
    amountNtd = totalBilled;
    taxNtd = 0;
    totalNtd = totalBilled;
  }

  const result = await query(
    `INSERT INTO invoices (id, billing_period_id, tenant_id, invoice_number, tax_id, company_name, amount_ntd, tax_ntd, total_ntd, status, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'draft', NOW())
     RETURNING *`,
    [billingPeriodId, tenantId, invoiceNumber, taxId, companyName, amountNtd, taxNtd, totalNtd]
  );

  return mapRow(result.rows[0]);
}

export async function issueInvoice(invoiceId: string): Promise<Invoice> {
  const result = await query(
    `UPDATE invoices SET status = 'issued', issued_at = NOW() WHERE id = $1 RETURNING *`,
    [invoiceId]
  );
  if (result.rows.length === 0) throw new Error("Invoice not found");
  return mapRow(result.rows[0]);
}

export async function voidInvoice(invoiceId: string): Promise<Invoice> {
  const result = await query(
    `UPDATE invoices SET status = 'voided' WHERE id = $1 RETURNING *`,
    [invoiceId]
  );
  if (result.rows.length === 0) throw new Error("Invoice not found");
  return mapRow(result.rows[0]);
}

export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const result = await query(`SELECT * FROM invoices WHERE id = $1`, [invoiceId]);
  return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
}

export async function getInvoicesByTenant(tenantId: string): Promise<Invoice[]> {
  const result = await query(
    `SELECT * FROM invoices WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId]
  );
  return result.rows.map(mapRow);
}

function mapRow(row: Record<string, unknown>): Invoice {
  return {
    id: row.id as string,
    billingPeriodId: row.billing_period_id as string,
    tenantId: row.tenant_id as string,
    invoiceNumber: row.invoice_number as string,
    taxId: row.tax_id as string | null,
    companyName: row.company_name as string,
    amountNtd: Number(row.amount_ntd),
    taxNtd: Number(row.tax_ntd),
    totalNtd: Number(row.total_ntd),
    pdfUrl: row.pdf_url as string | null,
    status: row.status as Invoice["status"],
    issuedAt: row.issued_at as string | null,
    createdAt: row.created_at as string,
  };
}
