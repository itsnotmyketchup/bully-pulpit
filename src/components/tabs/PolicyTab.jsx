import { POLICY_ACTIONS, POLICY_CATEGORIES } from "../../data/policies.js";
import Badge from "../Badge.jsx";
import BillProgress from "../BillProgress.jsx";

export default function PolicyTab({
  activeBill, billLikelihood, billFactionVotes,
  pendingNegotiation, act, maxActions, week,
  reconciliationCooldown, policyFilter, setPolicyFilter,
  lockedBills, billCooldowns, usedPol, cg,
  onOpenBudget, onPropose, onWalkAway, onAcceptAmendment,
}) {
  const budgetAvailable = reconciliationCooldown === 0 || week >= reconciliationCooldown;
  const weeksUntil = reconciliationCooldown > 0 ? Math.max(0, reconciliationCooldown - week) : 0;

  return <>
    {activeBill && <BillProgress bill={activeBill} passLikelihood={billLikelihood} factionVotes={billFactionVotes} />}

    {/* Negotiation panel */}
    {pendingNegotiation && activeBill && pendingNegotiation.stage === activeBill.stage && (
      <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: "var(--border-radius-lg)", border: "1.5px solid #EF9F27", background: "#EF9F2710" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#EF9F27" }}>⚡ Negotiation Opportunity</div>
          <button onClick={onWalkAway} style={{ fontSize: 9, padding: "2px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>Walk Away (−trust)</button>
        </div>
        <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 8 }}>
          The bill has stalled. Offer an amendment to gain additional support. You may only negotiate once per stage setback.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {pendingNegotiation.amendments.map(amend => (
            <div key={amend.id} style={{ padding: "8px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>{amend.label}</div>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 4 }}>{amend.desc}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {Object.entries(amend.factionMod).map(([fid, delta]) => (
                      <span key={fid} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: delta > 0 ? "#1D9E7520" : "#E24B4A20", color: delta > 0 ? "#1D9E75" : "#E24B4A" }}>
                        {delta > 0 ? "+" : ""}{(delta * 100).toFixed(0)}% {cg?.factions[fid]?.name?.split(" ")[0] || fid}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => onAcceptAmendment(amend)} style={{ flexShrink: 0, padding: "5px 10px", fontSize: 10, fontWeight: 600, background: "#EF9F27", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}>Accept</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {!activeBill && (
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 8 }}>
      Choose a bill to introduce. Only one bill may be in Congress at a time.
      </div>
    )}
    {activeBill && (
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 8 }}>
        A bill is currently in Congress. You must wait for it to pass or fail before introducing another.
      </div>
    )}

    {/* Budget Reconciliation */}
    <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: "var(--border-radius-lg)", border: "1px solid var(--color-border-secondary)", background: "var(--color-background-secondary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>Budget Reconciliation Act</div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Adjust tax rates and spending by up to ±10%</div>
          {!budgetAvailable && <div style={{ fontSize: 9, color: "#EF9F27" }}>Available in {weeksUntil} wk{weeksUntil !== 1 ? "s" : ""}</div>}
        </div>
        <button onClick={onOpenBudget} disabled={!budgetAvailable || !!activeBill}
          style={{ padding: "5px 12px", fontSize: 11, fontWeight: 500, background: !budgetAvailable || !!activeBill ? "var(--color-background-tertiary)" : "var(--color-text-primary)", color: !budgetAvailable || !!activeBill ? "var(--color-text-secondary)" : "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: !budgetAvailable || !!activeBill ? "not-allowed" : "pointer" }}>
          Open Budget
        </button>
      </div>
    </div>

    {/* Category filter */}
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
      {POLICY_CATEGORIES.map(cat => (
        <button key={cat} onClick={() => setPolicyFilter(cat)} style={{
          padding: "3px 9px", fontSize: 10, fontWeight: policyFilter === cat ? 600 : 400,
          background: policyFilter === cat ? "var(--color-text-primary)" : "var(--color-background-secondary)",
          color: policyFilter === cat ? "var(--color-background-primary)" : "var(--color-text-secondary)",
          border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer",
          textTransform: "capitalize",
        }}>{cat}</button>
      ))}
    </div>

    {POLICY_ACTIONS.filter(a => policyFilter === "all" || a.category === policyFilter).map(a => {
      const u = usedPol.has(a.id);
      const inCooldown = billCooldowns[a.id] && week < billCooldowns[a.id];
      const isLocked = lockedBills.has(a.id);
      const d = act + 2 > maxActions || u || !!activeBill || inCooldown || isLocked;
      const supporters = Object.entries(a.factionReactions).filter(([, v]) => v > 0.2).map(([fid]) => cg?.factions[fid]?.name?.split(" ")[0]).filter(Boolean);
      const opposers = Object.entries(a.factionReactions).filter(([, v]) => v < -0.2).map(([fid]) => cg?.factions[fid]?.name?.split(" ")[0]).filter(Boolean);
      return (
        <div key={a.id} style={{ marginBottom: 5, padding: "8px 12px", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", opacity: d ? 0.5 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 1 }}>
                {a.name}{u && !inCooldown ? " (enacted)" : ""}{inCooldown ? ` — retry wk ${billCooldowns[a.id]}` : ""}{isLocked ? " — Locked" : ""}
              </div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 3 }}>{a.desc}</div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {supporters.length > 0 && <Badge color="#1D9E75">Support: {supporters.join(", ")}</Badge>}
                {opposers.length > 0 && <Badge color="#E24B4A">Oppose: {opposers.join(", ")}</Badge>}
                {isLocked && <Badge color="#E24B4A">Locked</Badge>}
              </div>
            </div>
            <button onClick={() => onPropose(a)} disabled={d} style={{
              padding: "5px 12px", fontSize: 11, fontWeight: 500,
              background: d ? "var(--color-background-tertiary)" : "var(--color-text-primary)",
              color: d ? "var(--color-text-secondary)" : "var(--color-background-primary)",
              border: "none", borderRadius: "var(--border-radius-md)", cursor: d ? "not-allowed" : "pointer",
            }}>{u && !inCooldown ? "Enacted" : inCooldown ? `Retry wk ${billCooldowns[a.id]}` : isLocked ? "Locked" : "Introduce (2 actions)"}</button>
          </div>
        </div>
      );
    })}
  </>;
}
