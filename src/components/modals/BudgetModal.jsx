import { useState } from "react";
import { computeBudgetReactions } from "../../systems/budgetCalc.js";
import { computeBudgetProjection } from "../../logic/macroEconomy.js";

const RATE_CONTROLS = [
  { key: "corporateTaxRate", label: "Corporate tax", fmt: (v) => `${v.toFixed(0)}%` },
  { key: "incomeTaxLow", label: "Income tax <$50k", fmt: (v) => `${v.toFixed(0)}%` },
  { key: "incomeTaxMid", label: "Income tax <$200k", fmt: (v) => `${v.toFixed(0)}%` },
  { key: "incomeTaxHigh", label: "Income tax >$200k", fmt: (v) => `${v.toFixed(0)}%` },
  { key: "payrollTaxRate", label: "Payroll tax", fmt: (v) => `${v.toFixed(2)}%` },
];

const SPENDING_CONTROLS = [
  { key: "militarySpending", label: "Defense", fmt: (v) => `$${Math.round(v)}B` },
  { key: "educationSpending", label: "Education", fmt: (v) => `$${Math.round(v)}B` },
  { key: "infrastructureSpending", label: "Infrastructure", fmt: (v) => `$${Math.round(v)}B` },
];

const OTHER_DOMESTIC_SUBCONTROLS = [
  { key: "scienceTechnologySpending", label: "Science & technology", fmt: (v) => `$${Math.round(v)}B` },
  { key: "lawEnforcementSpending", label: "Law enforcement", fmt: (v) => `$${Math.round(v)}B` },
  { key: "agricultureSpending", label: "Agriculture", fmt: (v) => `$${Math.round(v)}B` },
  { key: "energyEnvironmentSpending", label: "Energy & environment", fmt: (v) => `$${Math.round(v)}B` },
  { key: "irsFunding", label: "IRS enforcement & operations", fmt: (v) => `$${Math.round(v)}B` },
];

const HEALTHCARE_CONTROLS = [
  {
    key: "medicareEligibilityAge",
    label: "Medicare eligibility age",
    options: [64, 65, 66, 67],
    fmt: (v) => `Age ${v}`,
  },
  {
    key: "drugPriceNegotiationLevel",
    label: "Drug price negotiation",
    options: [0, 1, 2],
    fmt: (v) => ({ 0: "None", 1: "Current law", 2: "Expanded" }[v] || "Current law"),
  },
  {
    key: "healthcareSubsidyLevel",
    label: "ACA premium subsidies",
    options: [-1, 0, 1],
    fmt: (v) => ({ [-1]: "Reduced", 0: "Current law", 1: "Expanded" }[v] || "Current law"),
  },
];

const TAX_CREDIT_CONTROLS = [
  {
    key: "childTaxCredit",
    label: "Child tax credit",
    options: [1000, 2000, 3000, 3600],
    fmt: (v) => `$${Math.round(v).toLocaleString()}`,
  },
  {
    key: "earnedIncomeTaxCredit",
    label: "Earned income tax credit",
    options: [4000, 6000, 7830, 9500],
    fmt: (v) => `$${Math.round(v).toLocaleString()}`,
  },
  {
    key: "saltDeductionCap",
    label: "SALT deduction cap",
    options: [5000, 10000, 20000, 40000, -1],
    fmt: (v) => (v < 0 ? "No cap" : `$${Math.round(v).toLocaleString()}`),
  },
  {
    key: "firstTimeHomebuyerTaxCredit",
    label: "First-time homebuyer credit",
    options: [0, 5000, 10000, 15000],
    fmt: (v) => `$${Math.round(v).toLocaleString()}`,
  },
  {
    key: "evTaxCredit",
    label: "EV tax credit",
    options: [0, 3750, 7500, 10000],
    fmt: (v) => `$${Math.round(v).toLocaleString()}`,
  },
  {
    key: "renewableInvestmentTaxCredit",
    label: "Renewable investment tax credit",
    options: [0, 15, 30, 40],
    fmt: (v) => `${Math.round(v)}%`,
  },
];

const cardStyle = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: "var(--border-radius-lg)",
  padding: "14px 15px",
};

const sectionLabelStyle = {
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "var(--color-text-secondary)",
  marginBottom: 6,
};

function formatSpendingDelta(delta) {
  if (Math.abs(delta) < 0.001) return "No change";
  return `${delta > 0 ? "+" : ""}${Math.round(delta * 100)}%`;
}

function valueTone(current, next) {
  if (next > current + 0.001) return "#E24B4A";
  if (next < current - 0.001) return "#1D9E75";
  return "var(--color-text-primary)";
}

function SpendingSlider({
  label,
  current,
  next,
  delta,
  onChange,
  fmt,
  compact = false,
  extraLabel = null,
  hideLabel = false,
  range = 10,
  step = 2,
}) {
  return (
    <div style={{ marginBottom: compact ? 10 : 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
        <span style={{ fontSize: compact ? 10 : 11, color: "var(--color-text-secondary)" }}>{hideLabel ? "" : label}</span>
        <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
          {fmt(current)} <span style={{ margin: "0 4px" }}>→</span>
          <span style={{ color: valueTone(current, next), fontWeight: 600 }}>{fmt(next)}</span>
          <span style={{ marginLeft: 6 }}>{extraLabel || formatSpendingDelta(delta)}</span>
        </span>
      </div>
      <input
        type="range"
        min={-range}
        max={range}
        step={step}
        value={Math.round(delta * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        style={{ width: "100%", accentColor: "#8FA7C1" }}
      />
    </div>
  );
}

function BudgetChoiceRow({ label, current, next, options, selected, onSelect, fmt }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{label}</span>
        <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
          {fmt(current)} <span style={{ margin: "0 4px" }}>→</span>
          <span style={{ color: valueTone(current, next), fontWeight: 600 }}>{fmt(next)}</span>
        </span>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {options.map((option) => {
          const active = selected === option;
          return (
            <button
              key={option}
              onClick={() => onSelect(option)}
              style={{
                padding: "5px 9px",
                fontSize: 10,
                borderRadius: "999px",
                border: active ? "0.5px solid rgba(55,138,221,0.55)" : "0.5px solid var(--color-border-secondary)",
                background: active ? "rgba(55,138,221,0.14)" : "var(--color-background-primary)",
                color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                cursor: "pointer",
              }}
            >
              {fmt(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BudgetModal({ budgetDraft, stats, macroState, factions, onChangeDraft, onSubmit, onCancel }) {
  const [otherExpanded, setOtherExpanded] = useState(false);
  if (!budgetDraft) return null;

  const reactions = computeBudgetReactions(budgetDraft);
  const projection = computeBudgetProjection(stats, macroState, budgetDraft);
  const nextStats = projection.stats;
  const otherDomesticCurrent = OTHER_DOMESTIC_SUBCONTROLS.reduce((sum, control) => sum + (stats[control.key] || 0), 0);
  const otherDomesticNext = OTHER_DOMESTIC_SUBCONTROLS.reduce((sum, control) => sum + (nextStats[control.key] || 0), 0);
  const deficitDelta = projection.nationalDeficit - stats.nationalDeficit;
  const debtDelta = projection.nationalDeficit / 1000;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(7,10,16,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "calc(var(--border-radius-lg) + 2px)", padding: "22px 24px", maxWidth: 860, width: "100%", border: "0.5px solid var(--color-border-secondary)", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 28px 80px rgba(0,0,0,0.35)" }}>
        <div style={{ borderBottom: "0.5px solid var(--color-border-secondary)", paddingBottom: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.16em", color: "#8FA7C1", marginBottom: 5 }}>Budget Reconciliation Briefing</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>Build a budget package for reconciliation</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.55, maxWidth: 520 }}>
                 Affect tax rates, discretionary and mandatory outlays, and tax credits and deducations.
              </div>
            </div>
            <div style={{ minWidth: 220, ...cardStyle, padding: "12px 14px" }}>
              <div style={{ ...sectionLabelStyle, marginBottom: 4 }}>First-Year Outlook</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: projection.nationalDeficit <= stats.nationalDeficit ? "#1D9E75" : "#E24B4A" }}>
                ${projection.nationalDeficit}B
              </div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2 }}>
                Annual deficit {deficitDelta === 0 ? "unchanged" : `${deficitDelta > 0 ? "up" : "down"} $${Math.abs(deficitDelta)}B`}
              </div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 6 }}>
                Debt path: roughly {debtDelta >= 0 ? "+" : ""}{debtDelta.toFixed(2)}T over the next year if conditions hold.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(260px, 0.8fr)", gap: 14 }}>
          <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
            <div style={cardStyle}>
              <div style={sectionLabelStyle}>Tax Rates</div>
              {RATE_CONTROLS.map(({ key, label, fmt }) => {
                const current = stats[key];
                const next = nextStats[key];
                const delta = budgetDraft[key] || 0;
                return (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{label}</span>
                      <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                        {fmt(current)} <span style={{ margin: "0 4px" }}>→</span>
                        <span style={{ color: valueTone(current, next), fontWeight: 600 }}>{fmt(next)}</span>
                        {delta !== 0 && <span style={{ marginLeft: 6 }}>{delta > 0 ? "+" : ""}{delta} pts</span>}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-5"
                      max="5"
                      step="1"
                      value={budgetDraft[key] || 0}
                      onChange={(e) => onChangeDraft(key, Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#8FA7C1" }}
                    />
                  </div>
                );
              })}
            </div>

            <div style={cardStyle}>
              <div style={sectionLabelStyle}>Spending</div>
              {SPENDING_CONTROLS.map(({ key, label, fmt }) => {
                const current = stats[key];
                const next = nextStats[key];
                const delta = budgetDraft[key] || 0;
                  return (
                    <SpendingSlider
                      key={key}
                    label={label}
                    current={current}
                    next={next}
                      delta={delta}
                      fmt={fmt}
                      range={20}
                      onChange={(value) => onChangeDraft(key, value)}
                    />
                  );
              })}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "var(--color-text-secondary)" }}>
                    <button
                      onClick={() => setOtherExpanded((value) => !value)}
                      aria-label={otherExpanded ? "Collapse other domestic categories" : "Expand other domestic categories"}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "var(--color-text-secondary)",
                        cursor: "pointer",
                        padding: 0,
                        fontSize: 10,
                        lineHeight: 1,
                        width: 12,
                      }}
                    >
                      {otherExpanded ? "▼" : "▶"}
                    </button>
                    <span>Other domestic</span>
                  </span>
                  <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                    ${Math.round(otherDomesticCurrent)}B <span style={{ margin: "0 4px" }}>→</span>
                    <span style={{ color: valueTone(otherDomesticCurrent, otherDomesticNext), fontWeight: 600 }}>${Math.round(otherDomesticNext)}B</span>
                  </span>
                </div>
                <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                  Computed from the subcategory funding lines below.
                </div>
                {otherExpanded && (
                  <div style={{ padding: "10px 12px 2px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 8 }}>
                      Subcategories
                    </div>
                    {OTHER_DOMESTIC_SUBCONTROLS.map((subcontrol) => (
                      <SpendingSlider
                        key={subcontrol.key}
                        label={subcontrol.label}
                        current={stats[subcontrol.key]}
                        next={nextStats[subcontrol.key]}
                        delta={budgetDraft[subcontrol.key] || 0}
                        fmt={subcontrol.fmt}
                        compact
                        range={40}
                        onChange={(value) => onChangeDraft(subcontrol.key, value)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={sectionLabelStyle}>Healthcare</div>
              {HEALTHCARE_CONTROLS.map(({ key, label, options, fmt }) => (
                <BudgetChoiceRow
                  key={key}
                  label={label}
                  current={stats[key]}
                  next={nextStats[key]}
                  options={options}
                  selected={budgetDraft[key]}
                  onSelect={(value) => onChangeDraft(key, value)}
                  fmt={fmt}
                />
              ))}
              <div style={{ marginTop: 4, paddingTop: 10, borderTop: "0.5px solid var(--color-border-secondary)", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Projected healthcare outlays</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: valueTone(stats.healthcareSpending, nextStats.healthcareSpending) }}>
                  ${Math.round(stats.healthcareSpending)}B → ${Math.round(nextStats.healthcareSpending)}B
                </span>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={sectionLabelStyle}>Tax Credits And Deductions</div>
              {TAX_CREDIT_CONTROLS.map(({ key, label, options, fmt }) => (
                <BudgetChoiceRow
                  key={key}
                  label={label}
                  current={stats[key]}
                  next={nextStats[key]}
                  options={options}
                  selected={budgetDraft[key]}
                  onSelect={(value) => onChangeDraft(key, value)}
                  fmt={fmt}
                />
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 14, alignContent: "start", position: "sticky", top: 12, alignSelf: "start" }}>
            <div style={cardStyle}>
              <div style={sectionLabelStyle}>Budget Snapshot</div>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Tax revenue</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>${projection.taxRevenue}B</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Federal spending</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>${projection.totalSpending}B</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Annual deficit</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: projection.nationalDeficit <= stats.nationalDeficit ? "#1D9E75" : "#E24B4A" }}>
                    ${projection.nationalDeficit}B
                  </span>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={sectionLabelStyle}>Faction Reactions</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(reactions).map(([factionId, value]) => {
                  const faction = factions[factionId];
                  if (!faction) return null;
                  const positive = value > 0.08;
                  const negative = value < -0.08;
                  return (
                    <span
                      key={factionId}
                      style={{
                        fontSize: 10,
                        padding: "4px 8px",
                        borderRadius: "999px",
                        background: positive ? "#1D9E7522" : negative ? "#E24B4A22" : "var(--color-background-secondary)",
                        color: positive ? "#1D9E75" : negative ? "#E24B4A" : "var(--color-text-secondary)",
                      }}
                    >
                      {faction.name}: {value > 0 ? "+" : ""}{(value * 100).toFixed(0)}%
                    </span>
                  );
                })}
              </div>
            </div>

            <div style={{ ...cardStyle, background: "linear-gradient(180deg, rgba(143,167,193,0.08), rgba(143,167,193,0.02))" }}>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                Reconciliation can change taxes, mandatory healthcare spending, and tax expenditures. Social Security benefit funding has been removed from this package.
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={onSubmit} style={{ flex: 1, padding: "9px 12px", fontSize: 12, fontWeight: 600, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}>Submit to Congress</button>
                <button onClick={onCancel} style={{ padding: "9px 16px", fontSize: 11, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
