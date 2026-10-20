/* eslint-disable @typescript-eslint/no-explicit-any */
// 離線檢查 Gemini 工具呼叫轉換（無可用金鑰時用）：請求格式＋回應正規化
import { normalizeToOpenAI, PROVIDER_CONFIGS } from "../src/lib/providers";
import assert from "node:assert/strict";
const cfg = PROVIDER_CONFIGS.google;
async function main() {
  const body = { model: "google/gemini-2.5-flash", tools: [{ type: "function", function: { name: "get_temp", description: "d", parameters: { type: "object", properties: { city: { type: "string" } } } } }],
    messages: [{ role: "system", content: "s" }, { role: "user", content: "台北幾度" },
      { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "get_temp", arguments: '{"city":"台北"}' } }] },
      { role: "tool", tool_call_id: "c1", content: '{"temp":24.5}' }] };
  if (cfg) {
    const t: any = cfg.transformRequest(body, "gemini-2.5-flash");
    assert.equal(t.tools[0].functionDeclarations[0].name, "get_temp");
    assert.deepEqual(t.contents[1], { role: "model", parts: [{ functionCall: { name: "get_temp", args: { city: "台北" } } }] });
    assert.deepEqual(t.contents[2], { role: "user", parts: [{ functionResponse: { name: "get_temp", response: { temp: 24.5 } } }] });
    console.log("request ok");
  } else console.log("PROVIDER_CONFIGS 未匯出，略過請求檢查");
  const o: any = normalizeToOpenAI("google", { candidates: [{ content: { parts: [{ functionCall: { name: "get_temp", args: { city: "台北" } } }] }, finishReason: "STOP" }] }, "google/gemini-2.5-flash");
  assert.equal(o.choices[0].finish_reason, "tool_calls");
  assert.equal(o.choices[0].message.tool_calls[0].function.arguments, '{"city":"台北"}');
  const p: any = normalizeToOpenAI("google", { candidates: [{ content: { parts: [{ text: "24.5 度" }] }, finishReason: "STOP" }] }, "m");
  assert.equal(p.choices[0].message.content, "24.5 度"); assert.equal(p.choices[0].finish_reason, "stop");
  console.log("response ok");
  // Hermes P2：不明 id 不可撈到原型鍵、tool_calls 非陣列不拋錯、自產 id 不碰撞
  const t2: any = cfg.transformRequest({ messages: [{ role: "assistant", content: "x", tool_calls: "bad" }, { role: "tool", tool_call_id: "constructor", content: "1" }] }, "m");
  assert.equal(t2.contents[1].parts[0].functionResponse.name, "tool");
  const resp = { candidates: [{ content: { parts: [{ functionCall: { name: "a" } }] }, finishReason: "STOP" }] };
  const ids = new Set(Array.from({ length: 50 }, () => (normalizeToOpenAI("google", resp, "m") as any).choices[0].message.tool_calls[0].id));
  assert.equal(ids.size, 50);
  console.log("p2 ok");
}
main().catch((e) => { console.error(e); process.exit(1); });
