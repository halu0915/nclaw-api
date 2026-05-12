import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const url = process.env.DATABASE_URL;
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const EMAIL = 'halu0915@gmail.com';

const cust = await c.query(`SELECT id, tenant_id FROM customers WHERE email = $1`, [EMAIL]);
if (cust.rows.length === 0) { console.log('No customer found'); await c.end(); process.exit(0); }
const { id: customerId, tenant_id: tenantId } = cust.rows[0];
console.log(`Customer: ${customerId}\nTenant:   ${tenantId}\n`);

// Discover tables that reference this tenant
const refTables = await c.query(`
  SELECT table_name FROM information_schema.columns
  WHERE column_name='tenant_id' AND table_schema='public'
  ORDER BY table_name
`);
console.log('Tables w/ tenant_id:', refTables.rows.map(r=>r.table_name).join(', '));

// Same for customer_id
const refCust = await c.query(`
  SELECT table_name FROM information_schema.columns
  WHERE column_name='customer_id' AND table_schema='public'
  ORDER BY table_name
`);
console.log('Tables w/ customer_id:', refCust.rows.map(r=>r.table_name).join(', '));

const mode = process.argv[2];
if (mode !== '--apply') { await c.end(); process.exit(0); }

console.log('\n[apply] starting transaction with savepoints...');
await c.query('BEGIN');
let total = 0;
async function tryDelete(sql, params, label) {
  await c.query('SAVEPOINT s');
  try {
    const r = await c.query(sql, params);
    await c.query('RELEASE SAVEPOINT s');
    console.log(`  ${label.padEnd(20)} -${r.rowCount}`);
    total += r.rowCount;
  } catch (e) {
    await c.query('ROLLBACK TO SAVEPOINT s');
    console.log(`  ${label.padEnd(20)} SKIP (${e.message.slice(0,80)})`);
  }
}

// Delete from all tables having tenant_id (most permissive cascade)
for (const r of refTables.rows) {
  await tryDelete(`DELETE FROM "${r.table_name}" WHERE tenant_id = $1`, [tenantId], r.table_name);
}
// Then customer_id-referencing tables (excluding ones already done by tenant_id)
const seenT = new Set(refTables.rows.map(r=>r.table_name));
for (const r of refCust.rows) {
  if (seenT.has(r.table_name) || r.table_name === 'customers') continue;
  await tryDelete(`DELETE FROM "${r.table_name}" WHERE customer_id = $1`, [customerId], r.table_name);
}
// Finally customer + tenant
await tryDelete(`DELETE FROM customers WHERE id = $1`, [customerId], 'customers');
await tryDelete(`DELETE FROM tenants WHERE id = $1`, [tenantId], 'tenants');

await c.query('COMMIT');
console.log(`\n[ok] committed. total ${total} rows deleted.`);
await c.end();
