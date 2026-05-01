import Image from "next/image";

export const metadata = {
  title: "N+Claw Pro — 工程業 AI 同事",
  description: "工程業個人 worker 的 AI 同事。預裝法規查詢、估算報價、消防設計、CAD 讀取等工程 skill。",
};

const FEATURES = [
  {
    icon: "📐",
    title: "預裝工程 Skill",
    desc: "消防灑水管徑速查、CAD/DWG 讀取、估算報價、規範查詢、PDF 圖說解析、廠商比價、工法 SOP、設計 review。",
  },
  {
    icon: "📚",
    title: "工程業專屬 KB",
    desc: "每次對話自動帶入規範條文、廠商行情、工法步驟。比 ChatGPT 更精準、引用可追溯。",
  },
  {
    icon: "🔌",
    title: "多 Model 智慧路由",
    desc: "Gemini / Claude / GPT / DeepSeek / Qwen 統一 API，依任務自動選最佳 model 省成本。",
  },
  {
    icon: "🖥",
    title: "桌面 GUI 零 CLI",
    desc: "雙擊 .app 開瀏覽器即用，不打字 CLI。第一次啟動自動配置完成。",
  },
];

export default function ProPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-20">
        {/* Hero */}
        <section className="text-center mb-16">
          <Image
            src="/nstar-logo.png"
            alt="N+Star"
            width={120}
            height={120}
            className="mx-auto mb-8 rounded-2xl shadow-xl"
            priority
          />
          <h1 className="text-4xl sm:text-6xl font-bold mb-4 tracking-tight">
            N+Claw Pro
          </h1>
          <p className="text-xl sm:text-2xl text-slate-300 mb-2">
            工程業個人 worker 的 AI 同事
          </p>
          <p className="text-sm text-slate-500 mb-10">
            PoC v0 · 由恩加斯達國際出品
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/download/NClawPro-PoC-v0.dmg"
              download
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-blue-600/20"
            >
              下載 macOS 版
            </a>
            <span className="text-sm text-slate-500">
              macOS 11.0+ · 415 KB · 免費試用
            </span>
          </div>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-20">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2 text-white">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* Install steps */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-6 text-center">安裝步驟</h2>
          <ol className="space-y-4 max-w-2xl mx-auto">
            {[
              { n: 1, title: "下載 DMG", desc: "點上方按鈕下載 NClawPro-PoC-v0.dmg" },
              { n: 2, title: "雙擊掛載", desc: "雙擊 dmg 檔開啟，看到 N+Claw Pro 圖示" },
              { n: 3, title: "拖到 Applications", desc: "把 N+Claw Pro 拖到右邊的 Applications 資料夾" },
              { n: 4, title: "繞過 Gatekeeper（首次）", desc: "雙擊 N+Claw Pro → 第一次會看到「無法打開」對話框。請進「系統設定 → 隱私與安全性」拉到最下方，點「仍要打開」並輸入密碼。再雙擊就能開了。如還不行，開啟 Terminal 貼：xattr -cr \"/Applications/N+Claw Pro.app\"" },
              { n: 5, title: "首次啟動", desc: "自動安裝 OpenClaw 與配置（需要 Node.js，沒裝會引導你下載）" },
              { n: 6, title: "開始用", desc: "瀏覽器自動開啟 N+Claw Pro Control UI，可以開始 chat" },
            ].map((step) => (
              <li
                key={step.n}
                className="flex gap-4 p-5 rounded-xl bg-slate-900/40 border border-slate-800"
              >
                <div className="shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
                  {step.n}
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{step.title}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Requirements */}
        <section className="mb-20 p-6 rounded-2xl bg-slate-900/40 border border-slate-800">
          <h2 className="text-xl font-bold mb-4">系統需求</h2>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>• macOS 11.0+（Big Sur 以上，Apple Silicon 或 Intel）</li>
            <li>• Node.js 22+（沒裝會引導下載）</li>
            <li>• 網路（首次安裝下載 OpenClaw 約 200 MB）</li>
            <li>• ~200 MB 硬碟空間</li>
          </ul>
        </section>

        {/* PoC notice */}
        <section className="p-6 rounded-2xl bg-amber-950/30 border border-amber-800/40">
          <h3 className="font-semibold mb-2 text-amber-200">PoC v0 限制</h3>
          <ul className="text-sm text-amber-200/80 space-y-1">
            <li>• 內含 1 個 demo skill（消防灑水管徑），完整 8 skill 留 v1</li>
            <li>• KB 為 mock 資料示範，真實 KB RAG 留 v1 接通</li>
            <li>• .app 未經 Apple notarization，第一次需手動繞 Gatekeeper</li>
            <li>• 無儲值 / 計量 / 推薦碼（v1 上線）</li>
          </ul>
          <p className="text-xs text-amber-200/60 mt-4">
            支援聯繫：support@nplusstar.ai · N+Claw by 恩加斯達國際
          </p>
        </section>
      </main>
    </div>
  );
}
