export default function LandingScreen({ onStart }) {
  return (
    <div style={{ minHeight: 440, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" }}>
      <div style={{ fontSize: 11, letterSpacing: 5, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: 8 }}>The Oval Office</div>
      <h1 style={{ fontSize: 28, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 6px", fontFamily: "var(--font-serif)" }}>Bully Pulpit</h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", maxWidth: 360, margin: "0 0 24px", lineHeight: 1.6 }}>Lead the nation. Shape policy. Navigate Congress. Handle crises.</p>
      <button onClick={onStart} style={{ padding: "10px 28px", fontSize: 14, fontWeight: 500, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}>Begin your presidency</button>
    </div>
  );
}
