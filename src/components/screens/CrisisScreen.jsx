import Badge from "../Badge.jsx";

export default function CrisisScreen({ curEv, wiy, yr, onChoice, act = 0, maxActions = 4 }) {
  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ fontSize: 11, letterSpacing: 3, color: "#E24B4A", textTransform: "uppercase", marginBottom: 6 }}>Event — Wk {wiy}, Yr {yr}</div>

      {curEv.isChainEvent && (
        <div style={{ marginBottom: 8, padding: "6px 10px", borderRadius: "var(--border-radius-md)", background: "rgba(124,58,237,0.10)", border: "0.5px solid #7c3aed", fontSize: 11, color: "#7c3aed" }}>
          ⛓ Part of event chain — follows <strong>{curEv.chainOf}</strong>
        </div>
      )}
      {curEv.triggeredBy && (
        <div style={{ marginBottom: 8, padding: "6px 10px", borderRadius: "var(--border-radius-md)", background: "rgba(239,159,39,0.12)", border: "0.5px solid #EF9F27", fontSize: 11, color: "#EF9F27" }}>
          ⚡ Consequence of <strong>{curEv.triggeredBy}</strong> being signed
        </div>
      )}
      {curEv.triggeredByAbsence && (
        <div style={{ marginBottom: 8, padding: "6px 10px", borderRadius: "var(--border-radius-md)", background: "rgba(226,75,74,0.10)", border: "0.5px solid #E24B4A", fontSize: 11, color: "#E24B4A" }}>
          ⚠ This occurred because <strong>{curEv.triggeredByAbsence}</strong> was never passed
        </div>
      )}

      <h2 style={{ fontSize: 17, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 4px" }}>{curEv.name}</h2>
      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6, margin: "0 0 10px" }}>{curEv.desc}</p>
      {curEv.affectedStates && (
        <div style={{ marginBottom: 10 }}>
          <Badge color="#D85A30">Affected: {curEv.affectedStates.join(", ")}</Badge>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {curEv.choices.map((c, i) => (
          (() => {
            const disabled = act + (c.actionCost || 0) > maxActions;
            return (
              <button key={i} onClick={() => onChoice(c)} disabled={disabled} style={{
                textAlign: "left", padding: "10px 12px", borderRadius: "var(--border-radius-lg)",
                border: "0.5px solid var(--color-border-tertiary)",
                background: "var(--color-background-primary)", cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
              }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{c.text}</div>
                {c.actionCost ? (
                  <div style={{ fontSize: 9, color: disabled ? "#b45309" : "var(--color-text-secondary)", marginTop: 3 }}>
                    Costs {c.actionCost} action{c.actionCost === 1 ? "" : "s"}
                    {disabled ? " — not enough actions left this week" : ""}
                  </div>
                ) : null}
                {c.schedulesChain && (
                  <div style={{ fontSize: 9, color: "#7c3aed", marginTop: 3 }}>⛓ Triggers a follow-up event in 4–8 weeks</div>
                )}
              </button>
            );
          })()
        ))}
      </div>
    </div>
  );
}
