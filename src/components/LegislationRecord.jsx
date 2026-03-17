import Badge from "./Badge.jsx";

export default function LegislationRecord({ billRecord }) {
  if (!billRecord || billRecord.length === 0) {
    return (
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", padding: "16px", textAlign: "center" }}>
        No legislation resolved yet.
      </div>
    );
  }

  return (
    <div>
      {[...billRecord].reverse().map((rec, i) => {
        const senateTotal = rec.senateYes + rec.senateNo;
        const houseTotal = rec.houseYes + rec.houseNo;
        const senatePct = senateTotal > 0 ? (rec.senateYes / senateTotal) * 100 : 0;
        const housePct = houseTotal > 0 ? (rec.houseYes / houseTotal) * 100 : 0;
        const badgeColor = rec.passed ? "#1D9E75" : rec.vetoed ? "#8B5CF6" : "#E24B4A";
        const badgeLabel = rec.passed ? "Signed" : rec.vetoed ? "Vetoed" : "Failed";

        return (
          <div key={i} style={{
            marginBottom: 8,
            padding: "10px 12px",
            borderRadius: "var(--border-radius-lg)",
            border: `1px solid ${rec.passed ? "#1D9E7544" : rec.vetoed ? "#8B5CF644" : "#E24B4A44"}`,
            background: rec.passed ? "#1D9E7508" : rec.vetoed ? "#8B5CF608" : "#E24B4A08",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>{rec.name}</span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>Wk {rec.week}</span>
                <Badge color={badgeColor}>{badgeLabel}</Badge>
              </div>
            </div>
            {/* Applied amendments */}
            {rec.amendments && rec.amendments.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 8, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Amendments</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {rec.amendments.map(a => (
                    <div key={a.id} style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>
                      • {a.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {rec.senateYes !== undefined && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>Senate</span>
                    <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{rec.senateYes} – {rec.senateNo}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "var(--color-background-tertiary)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${senatePct}%`, background: "#1D9E75", borderRadius: 3, transition: "width 0.3s" }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>House</span>
                    <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{rec.houseYes} – {rec.houseNo}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "var(--color-background-tertiary)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${housePct}%`, background: "#1D9E75", borderRadius: 3, transition: "width 0.3s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
