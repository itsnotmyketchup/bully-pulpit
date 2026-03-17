export default function SurrogateDoneModal({ result, onDismiss }) {
  if (!result) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", padding: "20px 24px", maxWidth: 360, width: "90%", border: "0.5px solid var(--color-border-secondary)" }}>
        {result.type === "foreign_visit" && <>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#378ADD", marginBottom: 4 }}>Surrogate Visit Complete</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{result.surrogateName} — {result.countryName}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>Relationship</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: result.relGain >= 2 ? "#1D9E75" : result.relGain < 0 ? "#E24B4A" : "var(--color-text-primary)" }}>{result.relGain >= 0 ? "+" : ""}{result.relGain}</div>
            </div>
            <div style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>Trust</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#1D9E75" }}>+{result.trustGain}</div>
            </div>
            {result.approvalGain > 0 && (
              <div style={{ flex: 1, background: "#1D9E7522", borderRadius: "var(--border-radius-md)", padding: "6px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#1D9E75" }}>Approval</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#1D9E75" }}>+{result.approvalGain}</div>
              </div>
            )}
          </div>
        </>}
        {result.type === "coach" && <>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: result.success ? "#1D9E75" : "#E24B4A", marginBottom: 4 }}>Coaching {result.success ? "Successful" : "Failed"}</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{result.surrogateName}</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 10 }}>
            {result.success
              ? `${result.factionName}'s leader improved their ${result.skill}. (+1)`
              : `${result.factionName}'s leader was resistant to coaching. No improvement.`}
          </div>
          <div style={{ fontSize: 10, color: "#EF9F27" }}>Coaching available again in 8 weeks.</div>
        </>}
        <button onClick={onDismiss} style={{ marginTop: 12, width: "100%", padding: "8px", fontSize: 12, fontWeight: 500, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}>Continue</button>
      </div>
    </div>
  );
}
