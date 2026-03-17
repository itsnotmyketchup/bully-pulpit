export default function ForeignVisitModal({ result, onDismiss }) {
  if (!result) return null;
  const { countryName, relGain, trustGain, approvalGain, factionLines } = result;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
      <div style={{
        background: "#FAFAF6", borderRadius: 4, maxWidth: 400, width: "100%", maxHeight: "88vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px #c8b49a",
        color: "#1a1208",
      }}>
        {/* Header */}
        <div style={{ background: "#1a2744", padding: "14px 20px 12px", borderRadius: "4px 4px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.25)" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: "0.15em", textTransform: "uppercase", whiteSpace: "nowrap" }}>U.S. Department of State</span>
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.25)" }} />
          </div>
          <div style={{ textAlign: "center", fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Diplomatic Cable · For Presidential Review
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* Memo fields */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7a6040", marginBottom: 10, textAlign: "center" }}>Memorandum</div>
            {[
              { label: "TO",      value: "The President, The White House" },
              { label: "FROM",    value: "Secretary of State" },
              { label: "SUBJECT", value: `Presidential Visit — ${countryName}` },
              { label: "CLASS.",  value: "UNCLASSIFIED // FOR OFFICIAL USE ONLY" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: "#7a6040", letterSpacing: "0.08em", minWidth: 52, textAlign: "right", paddingTop: 1 }}>{label}:</span>
                <span style={{ fontSize: 9, color: "#3a2810", lineHeight: 1.4 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Diplomatic outcomes */}
          <div style={{ borderTop: "1px solid #d4c4a8", borderBottom: "1px solid #d4c4a8", padding: "10px 0", marginBottom: 14 }}>
            <div style={{ fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7a6040", textAlign: "center", marginBottom: 10 }}>Diplomatic Outcomes</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, background: relGain >= 5 ? "#d4eedd" : relGain > 0 ? "#ede8e0" : "#f8d7d7", borderRadius: 3, padding: "6px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 7, color: relGain >= 5 ? "#2d6a3f" : relGain > 0 ? "#7a6040" : "#8b1a1a", textTransform: "uppercase", letterSpacing: "0.08em" }}>Relationship</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: relGain >= 5 ? "#2d6a3f" : relGain > 0 ? "#3a2810" : "#8b1a1a" }}>{relGain >= 0 ? "+" : ""}{relGain}</div>
              </div>
              <div style={{ flex: 1, background: "#d4eedd", borderRadius: 3, padding: "6px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 7, color: "#2d6a3f", textTransform: "uppercase", letterSpacing: "0.08em" }}>Trust</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#2d6a3f" }}>+{trustGain}</div>
              </div>
              {approvalGain > 0 && (
                <div style={{ flex: 1, background: "#d4eedd", borderRadius: 3, padding: "6px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 7, color: "#2d6a3f", textTransform: "uppercase", letterSpacing: "0.08em" }}>Approval</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#2d6a3f" }}>+{approvalGain}</div>
                </div>
              )}
            </div>
          </div>

          {/* Faction reactions */}
          {factionLines?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7a6040", marginBottom: 7 }}>Domestic Faction Reactions</div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {factionLines.map((line, i) => {
                  const isPos = line.includes("+");
                  const isNeg = line.includes("−") || line.includes("-") && !line.includes("+-");
                  return (
                    <span key={i} style={{
                      fontSize: 9, padding: "2px 7px", borderRadius: 3,
                      background: isPos ? "#d4eedd" : isNeg ? "#f8d7d7" : "#ede8e0",
                      color: isPos ? "#2d6a3f" : isNeg ? "#8b1a1a" : "#7a6040",
                    }}>{line}</span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dismiss */}
          <button onClick={onDismiss} style={{ width: "100%", padding: "10px 0", fontSize: 12, fontWeight: 600, background: "#1a2744", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", letterSpacing: "0.03em" }}>
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
