"use client";

import { useState } from "react";

const t = {
  en: {
    hero: "MEP Engineering AI API",
    heroSub: "Multi-Agent AI for Mechanical, Electrical & Plumbing engineering. OpenAI-compatible API powered by N+Claw.",
    quickStart: "Quick Start",
    feat1Title: "OpenAI Compatible",
    feat1Desc: "Drop-in replacement. Change base_url to api.nplusstar.ai and use your existing code.",
    feat2Title: "200+ Models",
    feat2Desc: "Access Claude, GPT-4o, Gemini, Llama, Qwen, DeepSeek and more through a single API key.",
    feat3Title: "MEP Knowledge",
    feat3Desc: "Built-in MEP engineering knowledge base. Estimates, code compliance, material specs.",
    pricing: "Pricing",
    agents: "Agents",
    contact: "Contact Us",
    endpoints: "API Endpoints",
    method: "Method",
    endpoint: "Endpoint",
    description: "Description",
    chatDesc: "Chat completion (streaming supported)",
    modelsDesc: "List available models",
    footer: "N+Star International Co., Ltd. | api.nplusstar.ai",
    light: "Light",
    standard: "Standard",
    pro: "Pro",
    enterprise: "Enterprise",
    custom: "Custom",
    unlimited: "Unlimited",
  },
  zh: {
    hero: "MEP 機電工程 AI API",
    heroSub: "多代理人 AI 系統，專為機電、水電、消防工程打造。相容 OpenAI 格式，由 N+Claw 驅動。",
    quickStart: "快速開始",
    feat1Title: "相容 OpenAI",
    feat1Desc: "無縫替換，只要把 base_url 改成 api.nplusstar.ai，現有程式碼直接可用。",
    feat2Title: "200+ 模型",
    feat2Desc: "一組 API Key 即可使用 Claude、GPT-4o、Gemini、Llama、Qwen、DeepSeek 等模型。",
    feat3Title: "MEP 知識庫",
    feat3Desc: "內建機電工程專業知識庫，涵蓋估算、法規合規、材料規格等。",
    pricing: "定價方案",
    agents: "個 Agent",
    contact: "聯繫我們",
    endpoints: "API 端點",
    method: "方法",
    endpoint: "端點",
    description: "說明",
    chatDesc: "對話補全（支援串流）",
    modelsDesc: "列出可用模型",
    footer: "恩加斯達國際有限公司 | api.nplusstar.ai",
    light: "輕量版",
    standard: "標準版",
    pro: "專業版",
    enterprise: "企業版",
    custom: "客製化",
    unlimited: "無上限",
  },
};

export default function Home() {
  const [lang, setLang] = useState<"en" | "zh">("zh");
  const l = t[lang];

  const plans = [
    { name: l.light, price: "2,990", agents: `3 ${l.agents}`, rpm: "10 RPM", tokens: "1M tokens/mo" },
    { name: l.standard, price: "9,900", agents: `5 ${l.agents}`, rpm: "30 RPM", tokens: "5M tokens/mo" },
    { name: l.pro, price: "29,900", agents: `7 ${l.agents}`, rpm: "100 RPM", tokens: "20M tokens/mo" },
    { name: l.enterprise, price: "Contact", agents: l.custom, rpm: "500+ RPM", tokens: l.unlimited },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
              N+
            </div>
            <span className="text-xl font-semibold">N+Claw API</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="px-3 py-1 rounded-full border border-gray-600 text-sm text-gray-300 hover:text-white hover:border-gray-400 transition-colors"
            >
              {lang === "en" ? "中文" : "EN"}
            </button>
            <a
              href="https://nplusstar.ai"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              nplusstar.ai
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">{l.hero}</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">{l.heroSub}</p>
          <a
            href="/chat"
            className="inline-block mt-8 px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-lg font-semibold transition-colors"
          >
            {lang === "zh" ? "立即體驗 AI 助手" : "Try AI Assistant Now"}
          </a>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-3xl mb-3">{"</>"}</div>
            <h3 className="text-lg font-semibold mb-2">{l.feat1Title}</h3>
            <p className="text-gray-400 text-sm">{l.feat1Desc}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-3xl mb-3">{"AI"}</div>
            <h3 className="text-lg font-semibold mb-2">{l.feat2Title}</h3>
            <p className="text-gray-400 text-sm">{l.feat2Desc}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-3xl mb-3">{"MEP"}</div>
            <h3 className="text-lg font-semibold mb-2">{l.feat3Title}</h3>
            <p className="text-gray-400 text-sm">{l.feat3Desc}</p>
          </div>
        </div>

        {/* Pricing */}
        <h2 className="text-3xl font-bold text-center mb-8">{l.pricing}</h2>
        <div className="grid md:grid-cols-4 gap-4 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl p-6 border ${
                plan.name === l.pro
                  ? "border-blue-500 bg-blue-950/30"
                  : "border-gray-800 bg-gray-900"
              }`}
            >
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="text-2xl font-bold my-3">
                {plan.price === "Contact" ? l.contact : `NT$${plan.price}`}
                {plan.price !== "Contact" && (
                  <span className="text-sm text-gray-400 font-normal">/mo</span>
                )}
              </div>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>{plan.agents}</li>
                <li>{plan.rpm}</li>
                <li>{plan.tokens}</li>
              </ul>
            </div>
          ))}
        </div>

        {/* Endpoints */}
        <h2 className="text-3xl font-bold text-center mb-8">{l.endpoints}</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left p-4">{l.method}</th>
                <th className="text-left p-4">{l.endpoint}</th>
                <th className="text-left p-4">{l.description}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr>
                <td className="p-4"><span className="bg-green-900 text-green-300 px-2 py-1 rounded text-xs">POST</span></td>
                <td className="p-4 font-mono text-blue-400">/v1/chat/completions</td>
                <td className="p-4 text-gray-400">{l.chatDesc}</td>
              </tr>
              <tr>
                <td className="p-4"><span className="bg-blue-900 text-blue-300 px-2 py-1 rounded text-xs">GET</span></td>
                <td className="p-4 font-mono text-blue-400">/v1/models</td>
                <td className="p-4 text-gray-400">{l.modelsDesc}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm mt-20 pb-8">
          {l.footer}
        </footer>
      </main>
    </div>
  );
}
