export default function CreditsSuccess() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fff", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center", maxWidth: 480, padding: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>&#10003;</div>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>付款成功</h1>
        <p style={{ color: "#888", fontSize: 16, marginBottom: 24 }}>您的 N+Star API Credits 點數已加值完成</p>
        <p style={{ color: "#666", fontSize: 14 }}>
          您可以透過 API 查詢餘額：<br />
          <code style={{ background: "#1a1a1a", padding: "4px 8px", borderRadius: 4, fontSize: 13 }}>
            GET /api/v1/credits/balance
          </code>
        </p>
      </div>
    </div>
  );
}
