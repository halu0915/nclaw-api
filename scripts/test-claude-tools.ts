// 實測：OpenAI 格式 tools → Anthropic → 回 OpenAI 格式 tool_calls → 帶 tool 結果再問一輪
import { callProvider, normalizeToOpenAI } from "../src/lib/providers";
const model = "anthropic/claude-sonnet-4-6";
const tools = [{ type: "function", function: { name: "get_temp", description: "查某城市氣溫", parameters: { type: "object", properties: { city: { type: "string" } }, required: ["city"] } } }];
async function main() {
  const messages: Array<Record<string, unknown>> = [{ role: "system", content: "用繁中簡短回答" }, { role: "user", content: "台北現在幾度？" }];
  const call = async () => { const c = await callProvider(model, { model, messages, tools }); const d = await c.response.json(); if (!c.response.ok) throw new Error(JSON.stringify(d)); return normalizeToOpenAI(c.provider, d, model) as any; };
  let o = await call();
  const msg = o.choices[0].message; console.log("round1 finish", o.choices[0].finish_reason, JSON.stringify(msg.tool_calls));
  if (!msg.tool_calls) process.exit(1);
  messages.push(msg, { role: "tool", tool_call_id: msg.tool_calls[0].id, content: '{"temp":24.5}' });
  o = await call();
  console.log("round2 finish", o.choices[0].finish_reason, o.choices[0].message.content);
  process.exit(o.choices[0].message.content?.includes("24") ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
