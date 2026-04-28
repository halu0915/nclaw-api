/**
 * 結構化 logger - 統一 JSON 格式輸出。
 *
 * 設計原則：
 * - 永遠輸出 JSON 一行（方便 Vercel/Logtail/Datadog index）
 * - 不丟失 console 行為（仍走 stdout/stderr）
 * - 自動帶 timestamp、level、event
 * - 支援自由欄位（tenant_id、api_key_id、model 等）
 *
 * 使用：
 *   import { log } from "@/lib/log";
 *   log.info("chat.request", { model, tenantId, latency_ms: 123 });
 *   log.error("chat.upstream_fail", { provider, status: 502 });
 */

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

// 動態 import，避免無 SENTRY_DSN 環境也載入 SDK
let sentryRef: typeof import("@sentry/nextjs") | null = null;
async function getSentry() {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return null;
  if (sentryRef) return sentryRef;
  try {
    sentryRef = await import("@sentry/nextjs");
    return sentryRef;
  } catch {
    return null;
  }
}

// 追蹤本 invocation 內所有 in-flight 的 Sentry capture，
// 讓 route handler 可在 return 前 await log.flush() 以避免 serverless freeze 前事件未送出。
const pending: Set<Promise<unknown>> = new Set();

function emit(level: Level, event: string, fields?: Fields) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(fields || {}),
  };
  const line = JSON.stringify(payload, replaceCircular());
  // error/warn 走 stderr，方便監控工具分流
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }

  // 錯誤自動上報 Sentry（不阻塞主流程，但保留 promise 供 flush 等待）
  if (level === "error") {
    const p = getSentry().then((s) => {
      if (!s) return;
      const err =
        fields?.error instanceof Error
          ? fields.error
          : new Error(typeof fields?.error === "string" ? fields.error : event);
      s.captureException(err, {
        tags: { event, ...(fields?.tenant_id ? { tenant_id: String(fields.tenant_id) } : {}) },
        extra: fields,
      });
    });
    pending.add(p);
    void p.finally(() => pending.delete(p));
  }
}

// 防 JSON.stringify 遇到循環引用爆掉
function replaceCircular() {
  const seen = new WeakSet<object>();
  return (_key: string, value: unknown) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value as object)) return "[Circular]";
      seen.add(value as object);
    }
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }
    return value;
  };
}

export const log = {
  debug: (event: string, fields?: Fields) => emit("debug", event, fields),
  info: (event: string, fields?: Fields) => emit("info", event, fields),
  warn: (event: string, fields?: Fields) => emit("warn", event, fields),
  error: (event: string, fields?: Fields) => emit("error", event, fields),
  // 在 serverless route 結束前呼叫，確保 Sentry event 真的送出。
  async flush(timeoutMs = 2000) {
    if (pending.size > 0) {
      await Promise.allSettled([...pending]);
    }
    const s = await getSentry();
    if (s) await s.flush(timeoutMs);
  },
};

/**
 * 產生 request_id（用在 log 與回應 header 串接同一請求）。
 * 簡短足夠，碰撞機率忽略。
 */
export function newRequestId(): string {
  return "req_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
