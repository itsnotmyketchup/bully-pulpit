export default function CrisisModal({ curEv, wiy, yr, onChoice, act = 0, maxActions = 4 }) {
  if (!curEv) return null;

  let sectionLabel = "BREAKING NEWS";
  let accentColor = "#cc1a1a";
  if (curEv.isChainEvent) { sectionLabel = "DEVELOPING"; accentColor = "#7c3aed"; }
  else if (curEv.triggeredBy) { sectionLabel = "POLICY CONSEQUENCE"; accentColor = "#c97d10"; }
  else if (curEv.triggeredByAbsence) { sectionLabel = "CRISIS REPORT"; accentColor = "#cc1a1a"; }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1020, padding: "16px",
    }}>
      <div style={{
        background: "#fff", maxWidth: 480, width: "100%", maxHeight: "90vh",
        overflowY: "auto", color: "#111",
        boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.08)",
        animation: "billFadeIn 0.3s cubic-bezier(0.22,1,0.36,1) both",
      }}>

        {/* Masthead bar */}
        <div style={{ borderBottom: "3px double #111", padding: "9px 18px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 8, fontWeight: 800, letterSpacing: "0.18em",
              color: "#fff", background: accentColor,
              padding: "2px 7px 3px", textTransform: "uppercase",
            }}>{sectionLabel}</span>
          </div>
          <div style={{ fontSize: 9, color: "#888", letterSpacing: "0.06em", fontVariant: "small-caps" }}>
            The National Record &nbsp;·&nbsp; Wk {wiy}, Yr {yr}
          </div>
        </div>

        {/* Context tags */}
        {(curEv.isChainEvent || curEv.triggeredBy || curEv.triggeredByAbsence) && (
          <div style={{ padding: "8px 18px 0", display: "flex", flexDirection: "column", gap: 3 }}>
            {curEv.isChainEvent && (
              <div style={{ fontSize: 10, color: "#7c3aed", fontStyle: "italic" }}>
                ⛓ Follows from: <strong>{curEv.chainOf}</strong>
              </div>
            )}
            {curEv.triggeredBy && (
              <div style={{ fontSize: 10, color: "#c97d10", fontStyle: "italic" }}>
                ⚡ In response to: <strong>{curEv.triggeredBy}</strong> being enacted
              </div>
            )}
            {curEv.triggeredByAbsence && (
              <div style={{ fontSize: 10, color: "#cc1a1a", fontStyle: "italic" }}>
                ⚠ Because <strong>{curEv.triggeredByAbsence}</strong> was never passed
              </div>
            )}
          </div>
        )}

        {/* Headline & body */}
        <div style={{ padding: "14px 18px 16px", borderBottom: "1px solid #e0e0e0" }}>
          <h2 style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 20, fontWeight: 700, color: "#111",
            lineHeight: 1.25, margin: "0 0 10px",
          }}>{curEv.name}</h2>
          <p style={{ fontSize: 13, color: "#333", lineHeight: 1.7, margin: 0 }}>{curEv.desc}</p>
          {curEv.affectedStates && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase" }}>Affected:</span>
              <span style={{ fontSize: 10, color: "#555" }}>{curEv.affectedStates.join(", ")}</span>
            </div>
          )}
        </div>

        {/* Response options */}
        <div style={{ padding: "13px 18px 18px", background: "#f8f8f6" }}>
          <div style={{
            fontSize: 8, fontWeight: 700, letterSpacing: "0.14em",
            color: "#999", textTransform: "uppercase", marginBottom: 9,
          }}>Presidential Response</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {curEv.choices.map((c, i) => (
              (() => {
                const disabled = act + (c.actionCost || 0) > maxActions;
                return (
              <button
                key={i}
                onClick={() => onChoice(c)}
                disabled={disabled}
                style={{
                  textAlign: "left", padding: "10px 13px",
                  border: "1px solid #d8d8d4",
                  borderLeft: `3px solid #111`,
                  background: disabled ? "#f2f2ef" : "#fff", cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.6 : 1,
                  transition: "background 0.12s, border-left-color 0.12s",
                }}
                onMouseEnter={e => {
                  if (disabled) return;
                  e.currentTarget.style.background = "#f0f0ec";
                  e.currentTarget.style.borderLeftColor = accentColor;
                }}
                onMouseLeave={e => {
                  if (disabled) return;
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.borderLeftColor = "#111";
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111", lineHeight: 1.45 }}>{c.text}</div>
                {c.actionCost ? (
                  <div style={{ fontSize: 9, color: disabled ? "#b45309" : "#666", marginTop: 4 }}>
                    Costs {c.actionCost} action{c.actionCost === 1 ? "" : "s"}
                    {disabled ? " — not enough actions left this week" : ""}
                  </div>
                ) : null}
                {c.schedulesChain && (
                  <div style={{ fontSize: 9, color: "#7c3aed", marginTop: 4 }}>
                    ⛓ Triggers a follow-up in {c.schedulesChain.minDelay}–{c.schedulesChain.maxDelay} weeks
                  </div>
                )}
              </button>
                );
              })()
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
