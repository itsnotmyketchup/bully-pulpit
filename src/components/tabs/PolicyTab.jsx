import { POLICY_ACTIONS, POLICY_CATEGORIES } from "../../data/policies.js";
import Badge from "../Badge.jsx";
import BillProgress from "../BillProgress.jsx";
import SectionHeader from "../SectionHeader.jsx";

const panelStyle = {
  background: "var(--color-background-secondary)",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: "var(--border-radius-lg)",
  overflow: "hidden",
};

const panelBodyStyle = {
  padding: "12px 14px",
};

const sectionLabelStyle = {
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--color-text-secondary)",
};

export default function PolicyTab({
  activeBill, billLikelihood, billFactionVotes,
  pendingNegotiation, act, maxActions, week,
  reconciliationCooldown, policyFilter, setPolicyFilter,
  lockedBills, billCooldowns, usedPol, cg,
  onOpenBudget, onPropose, onWalkAway, onAcceptAmendment,
}) {
  const budgetAvailable = reconciliationCooldown === 0 || week >= reconciliationCooldown;
  const weeksUntil = reconciliationCooldown > 0 ? Math.max(0, reconciliationCooldown - week) : 0;
  const filteredPolicies = POLICY_ACTIONS.filter(a => policyFilter === "all" || a.category === policyFilter);

  return <>
    {activeBill && <BillProgress bill={activeBill} passLikelihood={billLikelihood} factionVotes={billFactionVotes} />}

    {pendingNegotiation && activeBill && pendingNegotiation.stage === activeBill.stage && (
      <div style={{ ...panelStyle, marginBottom: 12, borderColor: "#C98B2E" }}>
        <div style={{ ...panelBodyStyle, borderBottom: "0.5px solid rgba(201, 139, 46, 0.28)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...sectionLabelStyle, marginBottom: 3 }}>Legislative Negotiation</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Amendments are available to recover support</div>
          </div>
          <button onClick={onWalkAway} style={{ fontSize: 9, padding: "3px 9px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", whiteSpace: "nowrap" }}>Walk Away (−trust)</button>
        </div>
        <div style={panelBodyStyle}>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 10, lineHeight: 1.55 }}>
            The bill has stalled. Offer an amendment to gain additional support. You may only negotiate once per stage setback.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pendingNegotiation.amendments.map(amend => (
              <div key={amend.id} style={{ padding: "9px 11px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>{amend.label}</div>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 5, lineHeight: 1.45 }}>{amend.desc}</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {Object.entries(amend.factionMod).map(([fid, delta]) => (
                        <span key={fid} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: delta > 0 ? "#1D9E7520" : "#E24B4A20", color: delta > 0 ? "#1D9E75" : "#E24B4A" }}>
                          {delta > 0 ? "+" : ""}{(delta * 100).toFixed(0)}% {cg?.factions[fid]?.name?.split(" ")[0] || fid}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => onAcceptAmendment(amend)} style={{ flexShrink: 0, padding: "5px 10px", fontSize: 10, fontWeight: 600, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}>Accept</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    <div style={{ ...panelStyle, marginBottom: 10 }}>
      <div style={{ ...panelBodyStyle, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 300px", minWidth: 220 }}>
          <div style={{ ...sectionLabelStyle, marginBottom: 3 }}>Legislative Agenda</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 3 }}>
            {!activeBill ? "Select a bill to send to Congress" : "A bill is already moving through Congress"}
          </div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1.55 }}>
            {!activeBill
              ? "Only one bill may be in Congress at a time. Introducing legislation consumes 2 actions."
              : "You must wait for the current bill to pass or fail before introducing another measure."}
          </div>
        </div>
        <div style={{ flex: "0 1 280px", minWidth: 220 }}>
          <div style={{ ...sectionLabelStyle, marginBottom: 3 }}>Budget Reconciliation</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>Budget Reconciliation Act</div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 8 }}>Adjust tax rates and spending by up to ±10%</div>
          {!budgetAvailable && <div style={{ fontSize: 9, color: "#C98B2E", marginBottom: 8 }}>Available in {weeksUntil} wk{weeksUntil !== 1 ? "s" : ""}</div>}
          <button onClick={onOpenBudget} disabled={!budgetAvailable || !!activeBill}
            style={{ padding: "6px 12px", fontSize: 11, fontWeight: 600, background: !budgetAvailable || !!activeBill ? "var(--color-background-tertiary)" : "var(--color-text-primary)", color: !budgetAvailable || !!activeBill ? "var(--color-text-secondary)" : "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: !budgetAvailable || !!activeBill ? "not-allowed" : "pointer" }}>
            Open Budget
          </button>
        </div>
      </div>
    </div>

    <SectionHeader label="Policy Docket" />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 2, background: "var(--color-background-tertiary)", borderRadius: "var(--border-radius-md)", padding: 2, width: "fit-content", flexWrap: "wrap" }}>
        {POLICY_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setPolicyFilter(cat)} style={{
            padding: "3px 9px", fontSize: 9, fontWeight: policyFilter === cat ? 600 : 400,
            background: policyFilter === cat ? "var(--color-background-secondary)" : "transparent",
            color: policyFilter === cat ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer",
            textTransform: "capitalize",
          }}>{cat}</button>
        ))}
      </div>
      <div style={{ fontSize: 9, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {filteredPolicies.length} measure{filteredPolicies.length !== 1 ? "s" : ""}
      </div>
    </div>

    {filteredPolicies.map(a => {
      const u = usedPol.has(a.id);
      const inCooldown = billCooldowns[a.id] && week < billCooldowns[a.id];
      const isLocked = lockedBills.has(a.id);
      const d = act + 2 > maxActions || u || !!activeBill || inCooldown || isLocked;
      const supporters = Object.entries(a.factionReactions).filter(([, v]) => v > 0.2).map(([fid]) => cg?.factions[fid]?.name?.split(" ")[0]).filter(Boolean);
      const opposers = Object.entries(a.factionReactions).filter(([, v]) => v < -0.2).map(([fid]) => cg?.factions[fid]?.name?.split(" ")[0]).filter(Boolean);
      return (
        <div key={a.id} style={{ ...panelStyle, marginBottom: 8, opacity: d ? 0.58 : 1 }}>
          <div style={{ ...panelBodyStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ ...sectionLabelStyle, marginBottom: 3 }}>{a.category}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>
                {a.name}{u && !inCooldown ? " (enacted)" : ""}{inCooldown ? ` — retry wk ${billCooldowns[a.id]}` : ""}{isLocked ? " — Locked" : ""}
              </div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 5, lineHeight: 1.5 }}>{a.desc}</div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {supporters.length > 0 && <Badge color="#1D9E75">Support: {supporters.join(", ")}</Badge>}
                {opposers.length > 0 && <Badge color="#E24B4A">Oppose: {opposers.join(", ")}</Badge>}
                {isLocked && <Badge color="#E24B4A">Locked</Badge>}
              </div>
            </div>
            <button onClick={() => onPropose(a)} disabled={d} style={{
              padding: "6px 12px", fontSize: 11, fontWeight: 600,
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
