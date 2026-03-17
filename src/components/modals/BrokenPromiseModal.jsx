export default function BrokenPromiseModal({ brokenPromises, onDismiss }) {
  if (!brokenPromises.length) return null;
  const { factionName, billName } = brokenPromises[0];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1002 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", padding: "20px 24px", maxWidth: 360, width: "90%", border: "1px solid #E24B4A44" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#E24B4A", marginBottom: 4 }}>Promise Broken</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Year-end deadline passed</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 10 }}>
          You failed to pass <b style={{ color: "var(--color-text-primary)" }}>"{billName}"</b> as promised to <b style={{ color: "var(--color-text-primary)" }}>{factionName}</b>.
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[["Relationship","−10"],["Trust","−15"]].map(([label, val]) => (
            <div key={label} style={{ flex: 1, background: "#E24B4A22", borderRadius: "var(--border-radius-md)", padding: "6px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#E24B4A" }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#E24B4A" }}>{val}</div>
            </div>
          ))}
        </div>
        <button onClick={onDismiss} style={{ width: "100%", padding: "8px", fontSize: 12, fontWeight: 500, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}>Acknowledge</button>
      </div>
    </div>
  );
}
