/**
 * Database migration script.
 *
 * Run with:  npx tsx scripts/migrate.ts
 *
 * Reads DATABASE_URL from the environment (or .env if you use dotenv).
 * Creates all tables idempotently (IF NOT EXISTS).
 */

import { Pool } from "pg";

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "ERROR: DATABASE_URL is not set. Export it before running this script.\n" +
        "  Example: DATABASE_URL=postgresql://user:pass@host:5432/db npx tsx scripts/migrate.ts"
    );
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    max: 2,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  const client = await pool.connect();

  try {
    console.log("[migrate] Connected to database. Running migrations...\n");

    await client.query("BEGIN");

    // ──────────────────────────────────────────
    // Enable uuid-ossp extension for uuid_generate_v4()
    // ──────────────────────────────────────────
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    console.log("[migrate] Extension uuid-ossp ensured.");

    // ──────────────────────────────────────────
    // 1. Tenants
    // ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name              TEXT NOT NULL,
        tax_id            TEXT,                           -- 統一編號
        email             TEXT,
        phone             TEXT,
        plan              TEXT NOT NULL DEFAULT 'free',
        status            TEXT NOT NULL DEFAULT 'active',
        monthly_budget_ntd NUMERIC,
        created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log("[migrate] Table tenants created.");

    // ──────────────────────────────────────────
    // 2. Departments
    // ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name                  TEXT NOT NULL,
        monthly_quota_tokens  BIGINT,
        tokens_used_this_month BIGINT NOT NULL DEFAULT 0,
        created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log("[migrate] Table departments created.");

    // ──────────────────────────────────────────
    // 2b. Employees
    // ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        department_id   UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
        name            TEXT NOT NULL,
        email           TEXT,
        role            TEXT NOT NULL DEFAULT 'member',
        created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log("[migrate] Table employees created.");

    // ──────────────────────────────────────────
    // 3. API Keys
    // ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
        employee_id     UUID REFERENCES employees(id) ON DELETE SET NULL,
        key_hash        TEXT NOT NULL,
        key_prefix      TEXT NOT NULL,               -- first 12 chars for display
        name            TEXT NOT NULL,
        plan            TEXT NOT NULL DEFAULT 'free',
        rate_limit_rpm  INT NOT NULL DEFAULT 60,
        allowed_models  TEXT[],                       -- NULL = all models allowed
        enabled         BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log("[migrate] Table api_keys created.");

    // ──────────────────────────────────────────
    // 4. Usage Logs
    // ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        api_key_id      UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
        department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
        model           TEXT NOT NULL,
        provider        TEXT NOT NULL,
        input_tokens    INT NOT NULL DEFAULT 0,
        output_tokens   INT NOT NULL DEFAULT 0,
        cached_tokens   INT NOT NULL DEFAULT 0,
        total_tokens    INT NOT NULL DEFAULT 0,
        cost_usd        NUMERIC NOT NULL DEFAULT 0,
        billed_ntd      NUMERIC NOT NULL DEFAULT 0,
        latency_ms      INT,
        status          TEXT NOT NULL DEFAULT 'success',
        error_message   TEXT,
        created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log("[migrate] Table usage_logs created.");

    // Indexes for usage_logs
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_usage_logs_tenant_created
        ON usage_logs (tenant_id, created_at);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_usage_logs_department_created
        ON usage_logs (department_id, created_at);
    `);
    console.log("[migrate] Indexes for usage_logs created.");

    // ──────────────────────────────────────────
    // 5. Rate Limit Windows (sliding window)
    // ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_windows (
        api_key_id      UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
        window_start    TIMESTAMP WITH TIME ZONE NOT NULL,
        request_count   INT NOT NULL DEFAULT 0,
        PRIMARY KEY (api_key_id, window_start)
      );
    `);
    console.log("[migrate] Table rate_limit_windows created.");

    // ──────────────────────────────────────────
    // 6. Billing Periods
    // ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS billing_periods (
        id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        period_start     DATE NOT NULL,
        period_end       DATE NOT NULL,
        total_requests   INT NOT NULL DEFAULT 0,
        total_tokens     BIGINT NOT NULL DEFAULT 0,
        total_cost_usd   NUMERIC NOT NULL DEFAULT 0,
        total_billed_ntd NUMERIC NOT NULL DEFAULT 0,
        status           TEXT NOT NULL DEFAULT 'draft',   -- draft / sent / paid
        invoice_number   TEXT,
        created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log("[migrate] Table billing_periods created.");

    // ──────────────────────────────────────────
    // 7. Invoices
    // ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        billing_period_id UUID NOT NULL REFERENCES billing_periods(id) ON DELETE CASCADE,
        tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        invoice_number    TEXT UNIQUE NOT NULL,
        tax_id            TEXT,                           -- 統一編號
        company_name      TEXT NOT NULL,
        amount_ntd        NUMERIC NOT NULL DEFAULT 0,
        tax_ntd           NUMERIC NOT NULL DEFAULT 0,
        total_ntd         NUMERIC NOT NULL DEFAULT 0,
        pdf_url           TEXT,
        status            TEXT NOT NULL DEFAULT 'draft',  -- draft / issued / paid / voided
        issued_at         TIMESTAMP WITH TIME ZONE,
        created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log("[migrate] Table invoices created.");

    // ──────────────────────────────────────────
    // 8. Model Fallbacks
    // ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS model_fallbacks (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        model           TEXT NOT NULL,
        fallback_model  TEXT NOT NULL,
        priority        INT NOT NULL DEFAULT 0,
        enabled         BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);
    console.log("[migrate] Table model_fallbacks created.");

    // ──────────────────────────────────────────
    // 9. Customers
    // ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
        email           TEXT UNIQUE NOT NULL,
        password_hash   TEXT NOT NULL,
        company_name    TEXT NOT NULL DEFAULT '',
        contact_name    TEXT NOT NULL DEFAULT '',
        phone           TEXT NOT NULL DEFAULT '',
        plan            TEXT NOT NULL DEFAULT 'free',
        api_key         TEXT,
        status          TEXT NOT NULL DEFAULT 'trial',
        token_quota     BIGINT NOT NULL DEFAULT 1000000,
        tokens_used     BIGINT NOT NULL DEFAULT 0,
        trial_ends_at   TIMESTAMP WITH TIME ZONE,
        created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log("[migrate] Table customers created.");

    // ──────────────────────────────────────────
    // 10. Credit Balances
    // ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_balances (
        tenant_id       UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
        balance         NUMERIC NOT NULL DEFAULT 0,
        updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log("[migrate] Table credit_balances created.");

    // ──────────────────────────────────────────
    // 11. Credit Transactions
    // ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        type              TEXT NOT NULL,
        amount            NUMERIC NOT NULL,
        balance_after     NUMERIC NOT NULL,
        description       TEXT NOT NULL DEFAULT '',
        stripe_session_id TEXT,
        created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_tenant
        ON credit_transactions (tenant_id, created_at);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_stripe
        ON credit_transactions (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
    `);
    console.log("[migrate] Tables credit_balances + credit_transactions created.");

    // ──────────────────────────────────────────
    // 12. Idempotency Keys
    // ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key             TEXT NOT NULL,
        api_key_id      UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
        request_hash    TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'pending',  -- pending / completed / failed
        response_status INT,
        response_body   JSONB,
        response_headers JSONB,
        created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        completed_at    TIMESTAMP WITH TIME ZONE,
        expires_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
        PRIMARY KEY (key, api_key_id)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires
        ON idempotency_keys (expires_at);
    `);
    console.log("[migrate] Table idempotency_keys created.");

    await client.query("COMMIT");

    console.log("\n[migrate] All migrations applied successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n[migrate] Migration failed — rolled back.\n", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
