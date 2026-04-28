import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.production.local");
const text = readFileSync(envPath, "utf-8");
for (const line of text.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  v = v.replace(/\\n/g, "").replace(/\\r/g, "").replace(/\\t/g, "");
  process.env[m[1]] = v;
}

import("./test-idempotency-impl");
