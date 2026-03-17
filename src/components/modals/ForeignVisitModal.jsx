export default function ForeignVisitModal({ result, onDismiss }) {
  if (!result) return null;
  const { countryName, relGain, trustGain, approvalGain, factionLines } = result;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", padding: "20px 24px", maxWidth: 360, width: "90%", border: "0.5px solid var(--color-border-secondary)" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#378ADD", marginBottom: 4 }}>Foreign Visit Result</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 10 }}>Visit to {countryName}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>Relationship</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: relGain >= 5 ? "#1D9E75" : relGain > 0 ? "var(--color-text-primary)" : "#E24B4A" }}>+{relGain}</div>
          </div>
          <div style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>Trust</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1D9E75" }}>+{trustGain}</div>
          </div>
          {approvalGain > 0 && (
            <div style={{ flex: 1, background: "#1D9E7522", borderRadius: "var(--border-radius-md)", padding: "6px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#1D9E75" }}>Approval</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#1D9E75" }}>+{approvalGain}</div>
            </div>
          )}
        </div>
        {factionLines?.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginBottom: 4 }}>Domestic faction reactions:</div>
            {factionLines.map((line, i) => (
              <div key={i} style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{line}</div>
            ))}
          </div>
        )}
        <button onClick={onDismiss} style={{ width: "100%", padding: "8px", fontSize: 12, fontWeight: 500, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}>Continue</button>
      </div>
    </div>
  );
}
