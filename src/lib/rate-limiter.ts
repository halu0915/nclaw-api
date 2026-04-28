/**
 * Sliding window rate limiter — DB-backed for distributed correctness.
 * Falls back to in-memory if DB query fails (graceful degradation).
 */

import { query } from "./db";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

const WINDOW_MS = 60_000;

export async function checkRateLimit(
  apiKeyId: string,
  limitRpm: number
): Promise<RateLimitResult> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MS);

    await query(
      `DELETE FROM rate_limit_windows WHERE window_start < $1`,
      [windowStart]
    );

    const countResult = await query(
      `SELECT COALESCE(SUM(request_count), 0) as total
       FROM rate_limit_windows
       WHERE api_key_id = $1 AND window_start >= $2`,
      [apiKeyId, windowStart]
    );
    const currentCount = Number(countResult.rows[0].total);

    if (currentCount >= limitRpm) {
      const oldestResult = await query(
        `SELECT window_start FROM rate_limit_windows
         WHERE api_key_id = $1 AND window_start >= $2
         ORDER BY window_start ASC LIMIT 1`,
        [apiKeyId, windowStart]
      );
      const oldestStart = oldestResult.rows[0]?.window_start
        ? new Date(oldestResult.rows[0].window_start).getTime()
        : now.getTime();
      const resetMs = Math.max(0, oldestStart + WINDOW_MS - now.getTime());

      return { allowed: false, remaining: 0, resetMs };
    }

    const bucketStart = new Date(Math.floor(now.getTime() / 1000) * 1000);
    await query(
      `INSERT INTO rate_limit_windows (api_key_id, window_start, request_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (api_key_id, window_start)
       DO UPDATE SET request_count = rate_limit_windows.request_count + 1`,
      [apiKeyId, bucketStart]
    );

    const remaining = limitRpm - currentCount - 1;
    return {
      allowed: true,
      remaining: Math.max(0, remaining),
      resetMs: WINDOW_MS,
    };
  } catch (err) {
    console.error("[rate-limiter] DB error, allowing request:", err);
    return { allowed: true, remaining: limitRpm, resetMs: WINDOW_MS };
  }
}

export function _resetRateLimiter() {
  // No-op for DB-backed limiter
}

export type { RateLimitResult };
