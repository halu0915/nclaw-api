"use client";

import { useState, useEffect } from "react";

const t = {
  en: {
    hero: "MEP Engineering AI API",
    heroSub: "Multi-Agent AI for Mechanical, Electrical & Plumbing engineering. OpenAI-compatible API powered by N+Claw.",
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
    tryNow: "Try AI Assistant Now",
    register: "Free Registration",
  },
  zh: {
    hero: "MEP 機電工程 AI API",
    heroSub: "多代理人 AI 系統，專為機電、水電、消防工程打造。相容 OpenAI 格式，由 N+Claw 驅動。",
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
    tryNow: "立即體驗 AI 助手",
    register: "免費註冊",
  },
};

// Animated gradient orbs
function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "10s", animationDelay: "2s" }} />
      <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "12s", animationDelay: "4s" }} />
    </div>
  );
}

// Typed text effect
function TypedText({ texts, className }: { texts: string[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const text = texts[index];
    if (typing) {
      if (displayed.length < text.length) {
        const timer = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), 60);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => setTyping(false), 2000);
        return () => clearTimeout(timer);
      }
    } else {
      if (displayed.length > 0) {
        const timer = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 30);
        return () => clearTimeout(timer);
      } else {
        setIndex((i) => (i + 1) % texts.length);
        setTyping(true);
      }
    }
  }, [displayed, typing, index, texts]);

  return (
    <span className={className}>
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}

export default function Home() {
  const [lang, setLang] = useState<"en" | "zh">("zh");
  const l = t[lang];

  const typedTexts = lang === "zh"
    ? ["估算 3 樓住宅的水電配管費用", "查詢消防排煙設備法規", "比較 PVC 管與不鏽鋼管", "生成工程報價單"]
    : ["Estimate plumbing costs for 3F residential", "Query fire protection regulations", "Compare PVC vs stainless steel pipes", "Generate engineering quotations"];

  const plans = [
    { name: l.light, price: "2,990", agents: `3 ${l.agents}`, rpm: "10 RPM", tokens: "1M tokens/mo" },
    { name: l.standard, price: "9,900", agents: `5 ${l.agents}`, rpm: "30 RPM", tokens: "5M tokens/mo" },
    { name: l.pro, price: "29,900", agents: `7 ${l.agents}`, rpm: "100 RPM", tokens: "20M tokens/mo" },
    { name: l.enterprise, price: "Contact", agents: l.custom, rpm: "500+ RPM", tokens: l.unlimited },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white relative">
      <BackgroundOrbs />

      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-xl bg-gray-950/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <a href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/20">
              N+
            </div>
            <span className="text-xl font-semibold">N+Claw API</span>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="/chat" className="text-gray-400 hover:text-white transition-colors">Chat</a>
            <a href="https://nplusstar.ai/pro" className="text-gray-400 hover:text-white transition-colors">Pro</a>
            <a href="https://nplusstar.ai/bot" className="text-gray-400 hover:text-white transition-colors">Bot</a>
            <a href="/" className="text-white font-medium border-b border-blue-400 pb-0.5">Developer</a>
          </nav>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <a href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
              {lang === "zh" ? "登入" : "Login"}
            </a>
            <a href="/register" className="text-sm px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 transition-colors">
              {l.register}
            </a>
            <button
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="px-3 py-1 rounded-full border border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
            >
              {lang === "en" ? "中文" : "EN"}
            </button>
          </div>
        </div>

        <nav className="md:hidden flex items-center justify-around border-t border-white/5 py-2 text-sm">
          <a href="/chat" className="text-gray-400 px-3 py-1">Chat</a>
          <a href="https://nplusstar.ai/pro" className="text-gray-400 px-3 py-1">Pro</a>
          <a href="https://nplusstar.ai/bot" className="text-gray-400 px-3 py-1">Bot</a>
          <a href="/" className="text-white font-medium px-3 py-1 border-b border-blue-400">Developer</a>
        </nav>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center py-24 sm:py-32">
          <h1 className="text-4xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-transparent leading-tight">
            {l.hero}
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-6">{l.heroSub}</p>

          {/* Typed demo */}
          <div className="bg-gray-900/60 backdrop-blur border border-white/10 rounded-2xl p-6 max-w-lg mx-auto mb-10">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="ml-2 font-mono">N+Claw AI</span>
            </div>
            <div className="text-left font-mono text-sm text-gray-300 h-6">
              <TypedText texts={typedTexts} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/chat"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40 hover:scale-105"
            >
              {l.tryNow}
            </a>
            <a
              href="/register"
              className="px-8 py-4 border border-white/10 hover:border-white/25 rounded-xl text-lg font-semibold transition-all backdrop-blur hover:bg-white/5"
            >
              {l.register}
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-24">
          {[
            { icon: "</>", title: l.feat1Title, desc: l.feat1Desc, gradient: "from-blue-500/10 to-transparent" },
            { icon: "AI", title: l.feat2Title, desc: l.feat2Desc, gradient: "from-purple-500/10 to-transparent" },
            { icon: "MEP", title: l.feat3Title, desc: l.feat3Desc, gradient: "from-cyan-500/10 to-transparent" },
          ].map((feat) => (
            <div
              key={feat.title}
              className="group bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-white/20 hover:from-white/10 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feat.gradient} border border-white/10 flex items-center justify-center text-lg font-bold mb-4 group-hover:scale-110 transition-transform`}>
                {feat.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feat.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-center mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{l.pricing}</h2>
          <p className="text-center text-gray-500 text-sm mb-10">{lang === "zh" ? "14 天免費試用，隨時可升降級" : "14-day free trial, upgrade or downgrade anytime"}</p>
          <div className="grid md:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 border backdrop-blur-sm transition-all duration-300 hover:scale-105 ${
                  plan.name === l.pro
                    ? "border-blue-500/50 bg-gradient-to-b from-blue-600/10 to-transparent shadow-lg shadow-blue-600/10"
                    : "border-white/10 bg-gradient-to-b from-white/5 to-transparent hover:border-white/20"
                }`}
              >
                {plan.name === l.pro && (
                  <span className="text-xs text-blue-400 font-semibold">{lang === "zh" ? "最受歡迎" : "Most Popular"}</span>
                )}
                <h3 className="text-lg font-semibold mt-1">{plan.name}</h3>
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
                <a href="/register" className={`block mt-4 text-center py-2 rounded-lg text-sm font-medium transition-colors ${
                  plan.name === l.pro
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "border border-white/10 hover:bg-white/5 text-gray-300"
                }`}>
                  {lang === "zh" ? "開始使用" : "Get Started"}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Endpoints */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{l.endpoints}</h2>
          <div className="bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-4 text-gray-400 font-medium">{l.method}</th>
                  <th className="text-left p-4 text-gray-400 font-medium">{l.endpoint}</th>
                  <th className="text-left p-4 text-gray-400 font-medium">{l.description}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="p-4"><span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-mono">POST</span></td>
                  <td className="p-4 font-mono text-blue-400">/v1/chat/completions</td>
                  <td className="p-4 text-gray-400">{l.chatDesc}</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="p-4"><span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-mono">GET</span></td>
                  <td className="p-4 font-mono text-blue-400">/v1/models</td>
                  <td className="p-4 text-gray-400">{l.modelsDesc}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-600 text-sm pb-12 border-t border-white/5 pt-8">
          {l.footer}
        </footer>
      </main>
    </div>
  );
}
