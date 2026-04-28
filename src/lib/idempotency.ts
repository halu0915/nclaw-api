import crypto from "crypto";
import { query } from "./db";

export type IdempotencyOutcome =
  | { kind: "fresh" }                                                          // 第一次見到，繼續處理
  | { kind: "replay"; status: number; body: unknown; headers: Record<string, string> }  // 命中快取，直接回傳上次結果
  | { kind: "in_progress" }                                                    // 同 key 同時兩個請求，後到的拒絕
  | { kind: "conflict" }                                                       // 同 key 不同 request body，拒絕
  | { kind: "invalid_format" };                                                // key 格式不合（太短/太長/含空白）

const KEY_RE = /^[A-Za-z0-9_\-]{8,255}$/;

export function hashRequest(method: string, path: string, body: unknown): string {
  const payload = JSON.stringify({ method, path, body });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * 嘗試「鎖定」一個 idempotency key，回傳該怎麼處理：
 * - fresh: 之前沒見過，這就是新請求 → 呼叫者繼續處理，最後再呼 finalize
 * - replay: 已完成過 → 直接 return 上次回應
 * - in_progress: 同 key 處理中 → 回 409
 * - conflict: 同 key 但 body 不同 → 回 422
 */
export async function beginIdempotency(
  key: string,
  apiKeyId: string,
  requestHash: string
): Promise<IdempotencyOutcome> {
  if (!KEY_RE.test(key)) return { kind: "invalid_format" };

  // 嘗試插入，狀態 pending
  const insert = await query(
    `INSERT INTO idempotency_keys (key, api_key_id, request_hash, status)
     VALUES ($1, $2, $3, 'pending')
     ON CONFLICT (key, api_key_id) DO NOTHING
     RETURNING key`,
    [key, apiKeyId, requestHash]
  );

  if (insert.rows.length > 0) {
    return { kind: "fresh" };
  }

  // 已存在，讀現況（自動清理過期的）
  const existing = await query<{
    request_hash: string;
    status: string;
    response_status: number | null;
    response_body: unknown;
    response_headers: Record<string, string> | null;
    expires_at: string;
  }>(
    `SELECT request_hash, status, response_status, response_body, response_headers, expires_at
     FROM idempotency_keys
     WHERE key = $1 AND api_key_id = $2`,
    [key, apiKeyId]
  );
  if (existing.rows.length === 0) {
    // 競態：剛才被別人刪了 (TTL clean)，重試一次插入
    return beginIdempotency(key, apiKeyId, requestHash);
  }

  const row = existing.rows[0];

  // 過期就刪掉重來
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await query(
      `DELETE FROM idempotency_keys WHERE key = $1 AND api_key_id = $2`,
      [key, apiKeyId]
    );
    return beginIdempotency(key, apiKeyId, requestHash);
  }

  // body 不同 → 422
  if (row.request_hash !== requestHash) {
    return { kind: "conflict" };
  }

  if (row.status === "completed" && row.response_status != null) {
    return {
      kind: "replay",
      status: row.response_status,
      body: row.response_body,
      headers: row.response_headers || {},
    };
  }

  // pending（含 failed 狀態時也視為 in_progress 讓客戶決定要不要再試）
  return { kind: "in_progress" };
}

/**
 * 完成一個 idempotency 紀錄，把回應快取下來。
 * 對 streaming 請求，呼叫者在串流跑完後傳入聚合好的 body（或標記為 streaming，不快取）。
 */
export async function finalizeIdempotency(
  key: string,
  apiKeyId: string,
  result: { status: number; body: unknown; headers?: Record<string, string> }
): Promise<void> {
  await query(
    `UPDATE idempotency_keys
     SET status = 'completed',
         response_status = $3,
         response_body = $4,
         response_headers = $5,
         completed_at = NOW()
     WHERE key = $1 AND api_key_id = $2`,
    [
      key,
      apiKeyId,
      result.status,
      JSON.stringify(result.body),
      JSON.stringify(result.headers || {}),
    ]
  );
}

/**
 * 處理失敗時呼叫，把記錄移除（讓客戶可以重試）。
 * 注意：如果上游已經扣費，呼叫方要先決定要不要保留為 completed。
 */
export async function abortIdempotency(key: string, apiKeyId: string): Promise<void> {
  await query(
    `DELETE FROM idempotency_keys WHERE key = $1 AND api_key_id = $2 AND status = 'pending'`,
    [key, apiKeyId]
  );
}

/**
 * 清掉過期的 idempotency 紀錄（給定期 cron 用）。
 */
export async function cleanupExpiredIdempotency(): Promise<number> {
  const r = await query(`DELETE FROM idempotency_keys WHERE expires_at < NOW()`);
  return r.rowCount ?? 0;
}
