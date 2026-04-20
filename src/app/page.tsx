export default function Home() {
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
          <a
            href="https://nplusstar.ai"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            nplusstar.ai
          </a>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            MEP Engineering AI API
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Multi-Agent AI for Mechanical, Electrical &amp; Plumbing engineering.
            OpenAI-compatible API powered by N+Claw.
          </p>
        </div>

        {/* Quick Start */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
          <pre className="bg-gray-950 rounded-lg p-6 text-sm overflow-x-auto text-gray-300">
{`curl https://api.nplusstar.ai/v1/chat/completions \\
  -H "Authorization: Bearer nplus_sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "anthropic/claude-sonnet-4-6",
    "messages": [
      {"role": "user", "content": "估算 3 樓住宅的水電配管費用"}
    ]
  }'`}
          </pre>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-3xl mb-3">{"</>"}</div>
            <h3 className="text-lg font-semibold mb-2">OpenAI Compatible</h3>
            <p className="text-gray-400 text-sm">
              Drop-in replacement. Change base_url to api.nplusstar.ai and use your existing code.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-3xl mb-3">{"AI"}</div>
            <h3 className="text-lg font-semibold mb-2">200+ Models</h3>
            <p className="text-gray-400 text-sm">
              Access Claude, GPT-4o, Gemini, Llama, Qwen, DeepSeek and more through a single API key.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-3xl mb-3">{"MEP"}</div>
            <h3 className="text-lg font-semibold mb-2">MEP Knowledge</h3>
            <p className="text-gray-400 text-sm">
              Built-in MEP engineering knowledge base. Estimates, code compliance, material specs.
            </p>
          </div>
        </div>

        {/* Pricing */}
        <h2 className="text-3xl font-bold text-center mb-8">Pricing</h2>
        <div className="grid md:grid-cols-4 gap-4 mb-16">
          {[
            { name: "Light", price: "2,990", agents: "3 Agents", rpm: "10 RPM", tokens: "1M tokens/mo" },
            { name: "Standard", price: "9,900", agents: "5 Agents", rpm: "30 RPM", tokens: "5M tokens/mo" },
            { name: "Pro", price: "29,900", agents: "7 Agents", rpm: "100 RPM", tokens: "20M tokens/mo" },
            { name: "Enterprise", price: "Contact", agents: "Custom", rpm: "500+ RPM", tokens: "Unlimited" },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl p-6 border ${
                plan.name === "Pro"
                  ? "border-blue-500 bg-blue-950/30"
                  : "border-gray-800 bg-gray-900"
              }`}
            >
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="text-2xl font-bold my-3">
                {plan.price === "Contact" ? "Contact Us" : `NT$${plan.price}`}
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
        <h2 className="text-3xl font-bold text-center mb-8">API Endpoints</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left p-4">Method</th>
                <th className="text-left p-4">Endpoint</th>
                <th className="text-left p-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr>
                <td className="p-4"><span className="bg-green-900 text-green-300 px-2 py-1 rounded text-xs">POST</span></td>
                <td className="p-4 font-mono text-blue-400">/v1/chat/completions</td>
                <td className="p-4 text-gray-400">Chat completion (streaming supported)</td>
              </tr>
              <tr>
                <td className="p-4"><span className="bg-blue-900 text-blue-300 px-2 py-1 rounded text-xs">GET</span></td>
                <td className="p-4 font-mono text-blue-400">/v1/models</td>
                <td className="p-4 text-gray-400">List available models</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm mt-20 pb-8">
          N+Star International Co., Ltd. | api.nplusstar.ai
        </footer>
      </main>
    </div>
  );
}
