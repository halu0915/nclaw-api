import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const url = process.env.DATABASE_URL;
if (!url) { console.error('no DATABASE_URL'); process.exit(1); }
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query(`SELECT id, email, company_name, tenant_id, created_at FROM customers WHERE email = $1`, ['halu0915@gmail.com']);
console.log('Found rows:', r.rows.length);
for (const row of r.rows) console.log(row);
await c.end();
