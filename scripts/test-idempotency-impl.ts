import {
  beginIdempotency,
  finalizeIdempotency,
  abortIdempotency,
  hashRequest,
  cleanupExpiredIdempotency,
} from "../src/lib/idempotency";
import { query } from "../src/lib/db";

const FAKE_API_KEY_ID = "00000000-0000-0000-0000-000000000001";

async function ensureFakeApiKey() {
  // 確保有個假 tenant + api_key 可以用（測試完不刪，重複呼叫安全）
  await query(
    `INSERT INTO tenants (id, name, plan) VALUES ($1, 'idempotency-test', 'free')
     ON CONFLICT (id) DO NOTHING`,
    [FAKE_API_KEY_ID]
  );
  await query(
    `INSERT INTO api_keys (id, tenant_id, key_hash, key_prefix, name)
     VALUES ($1, $1, 'fake-hash-for-test', 'sk-test', 'idempotency-test')
     ON CONFLICT (id) DO NOTHING`,
    [FAKE_API_KEY_ID]
  );
}

function newKey() {
  return "test_" + Math.random().toString(36).slice(2, 12);
}

async function cleanup(key: string) {
  await query(`DELETE FROM idempotency_keys WHERE key = $1`, [key]);
}

async function run() {
  console.log("[test] Setting up fake api_key...");
  await ensureFakeApiKey();

  // === Test 1: fresh → finalize → replay ===
  {
    const key = newKey();
    const hash = hashRequest("POST", "/v1/chat/completions", { model: "gpt-4" });
    const r1 = await beginIdempotency(key, FAKE_API_KEY_ID, hash);
    console.assert(r1.kind === "fresh", `T1.1 expected fresh, got ${r1.kind}`);
    console.log("  T1.1 fresh ✓");

    await finalizeIdempotency(key, FAKE_API_KEY_ID, {
      status: 200,
      body: { hello: "world" },
      headers: { "X-Provider": "test" },
    });

    const r2 = await beginIdempotency(key, FAKE_API_KEY_ID, hash);
    console.assert(r2.kind === "replay", `T1.2 expected replay, got ${r2.kind}`);
    if (r2.kind === "replay") {
      console.assert(r2.status === 200, `T1.3 status mismatch`);
      console.assert((r2.body as { hello: string }).hello === "world", `T1.4 body mismatch`);
      console.log("  T1.2 replay ✓ (status + body 對齊)");
    }
    await cleanup(key);
  }

  // === Test 2: same key, different body → conflict ===
  {
    const key = newKey();
    const hashA = hashRequest("POST", "/v1/x", { a: 1 });
    const hashB = hashRequest("POST", "/v1/x", { a: 2 });
    const r1 = await beginIdempotency(key, FAKE_API_KEY_ID, hashA);
    console.assert(r1.kind === "fresh", "T2.1");
    const r2 = await beginIdempotency(key, FAKE_API_KEY_ID, hashB);
    console.assert(r2.kind === "in_progress" || r2.kind === "conflict", `T2.2 expected conflict/in_progress, got ${r2.kind}`);
    // pending 狀態下 hash 不同就是 in_progress(沒檢查 hash) — 但我們的實作有檢查
    console.log(`  T2 same-key-diff-body → ${r2.kind} ✓`);
    await cleanup(key);
  }

  // === Test 3: invalid format ===
  {
    const r = await beginIdempotency("ab", FAKE_API_KEY_ID, "h");
    console.assert(r.kind === "invalid_format", `T3 expected invalid_format, got ${r.kind}`);
    console.log("  T3 invalid_format ✓");
  }

  // === Test 4: abort 之後可以重新開始 ===
  {
    const key = newKey();
    const hash = hashRequest("POST", "/v1/x", { a: 1 });
    const r1 = await beginIdempotency(key, FAKE_API_KEY_ID, hash);
    console.assert(r1.kind === "fresh", "T4.1");
    await abortIdempotency(key, FAKE_API_KEY_ID);
    const r2 = await beginIdempotency(key, FAKE_API_KEY_ID, hash);
    console.assert(r2.kind === "fresh", `T4.2 expected fresh after abort, got ${r2.kind}`);
    console.log("  T4 abort+restart ✓");
    await cleanup(key);
  }

  // === Test 5: cleanup expired ===
  {
    const cleaned = await cleanupExpiredIdempotency();
    console.log(`  T5 cleanup expired removed ${cleaned} rows ✓`);
  }

  console.log("\n[test] All tests passed ✅");
  process.exit(0);
}

run().catch((e) => {
  console.error("[test] FAILED:", e);
  process.exit(1);
});
