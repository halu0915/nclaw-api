import { readFileSync } from "fs";
import { resolve } from "path";

const text = readFileSync(resolve(process.cwd(), ".env.production.local"), "utf-8");
for (const line of text.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  v = v.replace(/\\n/g, "").replace(/\\r/g, "").replace(/\\t/g, "");
  process.env[m[1]] = v;
}

async function main() {
  const { GET } = await import("../src/app/api/health/route");
  const res = await GET();
  const body = await res.json();
  console.log("\n=== Response ===");
  console.log("HTTP", res.status);
  console.log(JSON.stringify(body, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
