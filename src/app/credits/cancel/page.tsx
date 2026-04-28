export default function CreditsCancel() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fff", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center", maxWidth: 480, padding: 40 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>付款已取消</h1>
        <p style={{ color: "#888", fontSize: 16 }}>您可以隨時透過 API 重新購買點數</p>
      </div>
    </div>
  );
}
