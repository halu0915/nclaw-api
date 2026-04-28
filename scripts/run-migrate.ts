/**
 * 用 dotenv-style 解析 .env.production.local，然後跑 migrate.ts。
 * 處理 Vercel env 中可能含字面 \n 的問題。
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.production.local");
const text = readFileSync(envPath, "utf-8");

for (const line of text.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  // 移除字面 \n、\r、\t
  v = v.replace(/\\n/g, "").replace(/\\r/g, "").replace(/\\t/g, "");
  process.env[m[1]] = v;
}

console.log("[run-migrate] DATABASE_URL host:", new URL(process.env.DATABASE_URL!).host);

import("./migrate");
