export default function EoResultModal({ eoResult, pn, week, onDismiss }) {
  if (!eoResult) return null;
  const { eo, mult, factionLines } = eoResult;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1010, padding: "16px" }}>
      <div style={{
        background: "#FAFAF6", borderRadius: 4, maxWidth: 400, width: "100%", maxHeight: "82vh", overflowY: "auto",
        boxShadow: "0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px #b8a888",
        animation: "billFadeIn 0.3s cubic-bezier(0.22,1,0.36,1) both", color: "#1a1208",
      }}>
        <div style={{ background: "#3d2200", padding: "12px 20px 10px", borderRadius: "4px 4px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.2)" }} />
            <span style={{ fontSize: 9, color: "rgba(255,220,150,0.9)", letterSpacing: "0.15em", textTransform: "uppercase", whiteSpace: "nowrap" }}>★ Executive Order ★</span>
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.2)" }} />
          </div>
          <div style={{ textAlign: "center", fontSize: 8, color: "rgba(255,200,100,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            By the Authority of the President of the United States
          </div>
        </div>
        <div style={{ padding: "18px 22px" }}>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a6030", marginBottom: 4 }}>{eo.category}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1208", lineHeight: 1.25, fontFamily: "Georgia, serif", marginBottom: 6 }}>{eo.name}</div>
            <div style={{ fontSize: 10, color: "#5a4830", lineHeight: 1.5 }}>{eo.desc}</div>
          </div>
          {(mult < 1 || eo.delayedEffects) && (
            <div style={{ borderTop: "1px solid #d4c4a8", borderBottom: "1px solid #d4c4a8", padding: "7px 0", marginBottom: 12 }}>
              {mult < 1 && (
                <div style={{ fontSize: 9, color: "#8a5a20", marginBottom: eo.delayedEffects ? 3 : 0 }}>
                  ⚠ Diminishing returns — effects applied at {Math.round(mult * 100)}%
                </div>
              )}
              {eo.delayedEffects && (
                <div style={{ fontSize: 9, color: "#7a6040" }}>◷ Some effects arrive in {eo.delayedEffects.weeks} weeks</div>
              )}
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 7, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9a8060", marginBottom: 6 }}>Faction Impact</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {factionLines.map((fl, i) => (
                <span key={i} style={{ fontSize: 9, padding: "3px 7px", borderRadius: 3, background: fl.val > 0 ? "#d4eedd" : "#f8d7d7", color: fl.val > 0 ? "#2d6a3f" : "#8b1a1a", fontWeight: 500 }}>
                  {fl.name.split(" ")[0]}: {fl.val > 0 ? "+" : ""}{fl.val} rel
                </span>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid #d4c4a8", paddingTop: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 8, color: "#9a8060", marginBottom: 3 }}>Signed and ordered,</div>
            <div style={{ fontSize: 22, fontFamily: "Georgia, serif", fontStyle: "italic", color: "#1a2744", animation: "signatureDraw 1.2s ease-out 0.1s both", display: "inline-block", lineHeight: 1 }}>
              {pn || "President"}
            </div>
            <div style={{ height: 1, background: "#c8b49a", marginTop: 3, marginBottom: 3 }} />
            <div style={{ fontSize: 8, color: "#9a8060" }}>President of the United States · Week {week}</div>
          </div>
          <button onClick={onDismiss} style={{ width: "100%", padding: "8px 0", fontSize: 11, fontWeight: 600, background: "#3d2200", color: "rgba(255,220,150,0.95)", border: "none", borderRadius: 3, cursor: "pointer", letterSpacing: "0.05em" }}>Dismiss Order</button>
        </div>
      </div>
    </div>
  );
}
