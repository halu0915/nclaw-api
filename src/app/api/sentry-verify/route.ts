import { NextResponse } from "next/server";
import { log } from "@/lib/log";

/**
 * 測試路由：故意丟錯誤，驗證 Sentry 接收。
 * 部署驗證後可刪除這檔案。
 *
 * 用法：
 *   curl https://api.nplusstar.ai/api/_sentry-test
 *   → 回 500，Sentry 應該幾秒內收到事件
 */
export async function GET() {
  log.info("sentry_test.invoked", { source: "manual-verification" });

  try {
    throw new Error("Sentry verification — this is intentional. Safe to ignore.");
  } catch (e) {
    log.error("sentry_test.error", {
      error: e,
      tenant_id: "test-verification",
      verification: true,
    });
    await log.flush();
    return NextResponse.json(
      {
        ok: false,
        message: "Test error fired. Check Sentry within 30 seconds.",
        error: (e as Error).message,
      },
      { status: 500 }
    );
  }
}
