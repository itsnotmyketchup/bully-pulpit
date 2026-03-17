import { computeBudgetReactions } from "../../systems/budgetCalc.js";

const BUDGET_KEYS = [
  { key: "corporateTaxRate",       label: "Corporate Tax",        fmt: v => v.toFixed(0) + "%" },
  { key: "incomeTaxLow",           label: "Income Tax <$50k",     fmt: v => v.toFixed(0) + "%" },
  { key: "incomeTaxMid",           label: "Income Tax <$200k",    fmt: v => v.toFixed(0) + "%" },
  { key: "incomeTaxHigh",          label: "Income Tax >$200k",    fmt: v => v.toFixed(0) + "%" },
  { key: "payrollTaxRate",         label: "Payroll Tax",          fmt: v => v.toFixed(2) + "%" },
  { key: "militarySpending",       label: "Defense",              fmt: v => "$" + Math.round(v) + "B" },
  { key: "educationSpending",      label: "Education",            fmt: v => "$" + Math.round(v) + "B" },
  { key: "healthcareSpending",     label: "Healthcare",           fmt: v => "$" + Math.round(v) + "B" },
  { key: "infrastructureSpending", label: "Infrastructure",       fmt: v => "$" + Math.round(v) + "B" },
];

export default function BudgetModal({ budgetDraft, stats, factions, onChangeDraft, onSubmit, onCancel }) {
  if (!budgetDraft) return null;

  const reactions = computeBudgetReactions(budgetDraft);

  const ns = {};
  BUDGET_KEYS.forEach(({ key }) => { ns[key] = stats[key] * (1 + (budgetDraft[key] || 0)); });
  const projTaxRev  = 2200 * (ns.incomeTaxMid / 22) + 500 * (ns.corporateTaxRate / 21) + 1300 * (ns.payrollTaxRate / 7.65);
  const projSpending = ns.militarySpending + ns.educationSpending + ns.healthcareSpending + ns.infrastructureSpending + 3200;
  const projDeficit  = Math.round(projSpending - projTaxRev);
  const deficitDelta = projDeficit - stats.nationalDeficit;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", padding: "20px 24px", maxWidth: 480, width: "95%", border: "0.5px solid var(--color-border-secondary)", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#378ADD", marginBottom: 4 }}>Budget Reconciliation</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Adjust Tax Rates & Spending</div>

        {BUDGET_KEYS.map(({ key, label, fmt }) => {
          const currentVal = stats[key];
          const delta      = budgetDraft[key] || 0;
          const newVal     = currentVal * (1 + delta);
          return (
            <div key={key} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{label}</span>
                <span style={{ fontSize: 10 }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>{fmt(currentVal)}</span>
                  <span style={{ margin: "0 4px", color: "var(--color-text-secondary)" }}>→</span>
                  <span style={{ color: delta > 0.001 ? "#E24B4A" : delta < -0.001 ? "#1D9E75" : "var(--color-text-primary)", fontWeight: 500 }}>{fmt(newVal)}</span>
                  <span style={{ fontSize: 9, marginLeft: 4, color: delta > 0 ? "#E24B4A" : delta < 0 ? "#1D9E75" : "var(--color-text-secondary)" }}>{delta !== 0 ? (delta > 0 ? "+" : "") + (delta * 100).toFixed(0) + "%" : ""}</span>
                </span>
              </div>
              <input type="range" min="-10" max="10" value={Math.round((budgetDraft[key] || 0) * 100)}
                onChange={e => onChangeDraft(key, Number(e.target.value) / 100)}
                style={{ width: "100%", accentColor: "#378ADD" }} />
            </div>
          );
        })}

        <div style={{ borderTop: "1px solid var(--color-border-tertiary)", marginTop: 12, paddingTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Projected deficit</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: projDeficit < stats.nationalDeficit ? "#1D9E75" : "#E24B4A" }}>
              ${projDeficit}B {deficitDelta !== 0 ? (deficitDelta > 0 ? "▲+" : "▼") + Math.abs(deficitDelta) + "B" : ""}
            </span>
          </div>
          <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginBottom: 4 }}>Faction reactions:</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
            {Object.entries(reactions).map(([fid, v]) => {
              const f = factions[fid];
              if (!f) return null;
              return (
                <span key={fid} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: v > 0.2 ? "#1D9E7522" : v < -0.2 ? "#E24B4A22" : "var(--color-background-secondary)", color: v > 0.2 ? "#1D9E75" : v < -0.2 ? "#E24B4A" : "var(--color-text-secondary)" }}>
                  {f.name.split(" ")[0]}: {v > 0 ? "+" : ""}{(v * 100).toFixed(0)}%
                </span>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onSubmit} style={{ flex: 1, padding: "8px", fontSize: 12, fontWeight: 500, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}>Submit to Congress</button>
            <button onClick={onCancel} style={{ padding: "8px 16px", fontSize: 11, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
