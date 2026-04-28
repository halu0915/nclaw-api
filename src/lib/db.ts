import { Pool, QueryResultRow } from "pg";

/**
 * PostgreSQL connection pool — singleton pattern for serverless (Vercel).
 *
 * In serverless environments each invocation may re-import this module, but
 * within a single warm container the module-level `pool` is reused.  We also
 * stash the instance on `globalThis` so that hot-reloads during local dev
 * don't leak connections.
 */

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (globalThis.__pgPool) {
    return globalThis.__pgPool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Provide a PostgreSQL connection string (e.g. postgresql://user:pass@host:5432/db)."
    );
  }

  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    // On Railway the certificate is managed; allow SSL but don't reject
    // self-signed certs typical of managed Postgres providers.
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  // Surface unexpected errors so they don't crash silently.
  pool.on("error", (err) => {
    console.error("[db] Unexpected error on idle client", err);
  });

  globalThis.__pgPool = pool;
  return pool;
}

export const pool = getPool();

/**
 * Convenience wrapper around `pool.query`.
 *
 * Usage:
 *   const { rows } = await query<Tenant>('SELECT * FROM tenants WHERE id = $1', [id]);
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params);
}

export default pool;
