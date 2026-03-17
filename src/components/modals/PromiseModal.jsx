import { POLICY_ACTIONS } from "../../data/policies.js";

export default function PromiseModal({ pendingPromise, factions, week, onConfirm, onCancel }) {
  if (!pendingPromise) return null;
  const bill    = POLICY_ACTIONS.find(a => a.id === pendingPromise.billId);
  const faction = factions[pendingPromise.factionId];
  const yearEnd = Math.ceil(week / 52) * 52;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1005 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", padding: "20px 24px", maxWidth: 380, width: "90%", border: "0.5px solid var(--color-border-secondary)" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#EF9F27", marginBottom: 4 }}>Make a Promise?</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Promise to {faction?.name}</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>
          You will commit to passing <b style={{ color: "var(--color-text-primary)" }}>"{bill?.name}"</b> by week {yearEnd} (year end).
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, background: "#1D9E7522", borderRadius: "var(--border-radius-md)", padding: "6px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#1D9E75" }}>Immediate</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1D9E75" }}>+{pendingPromise.relBoost} Rel</div>
          </div>
          <div style={{ flex: 1, background: "#E24B4A22", borderRadius: "var(--border-radius-md)", padding: "6px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#E24B4A" }}>If broken</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#E24B4A" }}>−10 Rel, −15 Trust</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onConfirm} style={{ flex: 1, padding: "8px", fontSize: 12, fontWeight: 500, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}>Commit</button>
          <button onClick={onCancel} style={{ padding: "8px 16px", fontSize: 11, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
