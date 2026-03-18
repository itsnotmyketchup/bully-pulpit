import { useState } from "react";
import StatCard from "../StatCard.jsx";
import BillProgress from "../BillProgress.jsx";
import TileMap from "../TileMap.jsx";
import SectionHeader from "../SectionHeader.jsx";
import { SM } from "../../data/stats.js";

const MAP_VIEWS = [
  { id: "approval", label: "Approval" },
  { id: "partisanship", label: "Partisanship" },
  { id: "education", label: "Education" },
  { id: "urban", label: "Urban" },
  { id: "religious", label: "Religious" },
];

export default function OverviewTab({ stats, prev, hist, sA, stateHist, hov, setHov, activeBill, billLikelihood, week, macroState }) {
  const [mapView, setMapView] = useState("approval");
  const [otherExpanded, setOtherExpanded] = useState(false);
  const yr = Math.ceil(week / 52);
  const wiy = ((week - 1) % 52) + 1;
  const appDelta = stats.approvalRating - prev.approvalRating;
  const approvalColor = stats.approvalRating >= 55 ? "#1D9E75" : stats.approvalRating < 42 ? "#E24B4A" : "var(--color-text-primary)";
  const defColor = stats.nationalDeficit < 0 ? "#1D9E75" : stats.nationalDeficit > 2500 ? "#E24B4A" : stats.nationalDeficit > 1800 ? "#EF9F27" : "var(--color-text-primary)";
  const otherBreakdown = [
    ["Science & Technology", stats.scienceTechnologySpending],
    ["Law Enforcement", stats.lawEnforcementSpending],
    ["Agriculture", stats.agricultureSpending],
    ["Energy & Environment", stats.energyEnvironmentSpending],
  ];

  const LEGENDS = {
    approval: [["#E24B4A","<38%"],["#D85A30","38-44"],["#EF9F27","44-48"],["#9FE1CB","48-52"],["#5DCAA5","52-58"],["#1D9E75",">58%"]],
    partisanship: [["#c0392b","Strong R"],["#e74c3c","Lean R"],["#f1948a","Tilt R"],["#7fb3d3","Tilt D"],["#2980b9","Lean D"],["#1a5276","Strong D"]],
    education: [["#dbeafe","<46%"],["#93c5fd","46-52"],["#60a5fa","52-58"],["#3b82f6","58-65"],["#2563eb","65-75"],["#1d4ed8",">75%"]],
    urban: [["#ede9fe","<47%"],["#c4b5fd","47-57"],["#a78bfa","57-68"],["#8b5cf6","68-78"],["#7c3aed","78-90"],["#5b21b6",">90%"]],
    religious: [["#fef9c3","<35%"],["#fde68a","35-45"],["#fbbf24","45-55"],["#f59e0b","55-65"],["#d97706","65-75"],["#b45309",">75%"]],
  };

  const panelStyle = {
    background: "var(--color-background-secondary)",
    borderRadius: "var(--border-radius-lg)",
    padding: "12px",
    border: "0.5px solid var(--color-border-secondary)",
  };

  const cardGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))",
    gap: 8,
  };

  const renderStatGroup = (label, keys) => (
    <div style={panelStyle}>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 8 }}>{label}</div>
      <div style={cardGridStyle}>
        {keys.map(k => (
          <StatCard key={k} statKey={k} value={stats[k]} history={hist[k]} prevValue={prev[k]} />
        ))}
      </div>
    </div>
  );

  const renderBudgetRow = (label, val, pval, opts = {}) => {
    const d = val - pval;
    const chg = Math.abs(d) > 1;
    const hasChildren = Boolean(opts.children);
    return (
      <div key={label} style={{ borderBottom: "0.5px solid var(--color-border-secondary)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--color-text-secondary)" }}>
            {hasChildren && (
              <button
                onClick={opts.onToggle}
                aria-label={opts.expanded ? `Collapse ${label}` : `Expand ${label}`}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--color-text-secondary)",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 9,
                  lineHeight: 1,
                  width: 10,
                }}
              >
                {opts.expanded ? "▼" : "▶"}
              </button>
            )}
            <span>{label}</span>
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-primary)" }}>
            ${Math.round(val)}B
            {chg && <span style={{ fontSize: 9, marginLeft: 4, color: d > 0 ? "#1D9E75" : "#E24B4A" }}>{d > 0 ? "▲" : "▼"} {Math.abs(Math.round(d))}B</span>}
          </span>
        </div>
        {hasChildren && opts.expanded && (
          <div style={{ padding: "0 0 6px 16px" }}>
            {opts.children.map(([childLabel, childVal]) => (
              <div key={childLabel} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" }}>
                <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{childLabel}</span>
                <span style={{ fontSize: 10, color: "var(--color-text-primary)" }}>${Math.round(childVal)}B</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return <>
    {/* Approval Hero */}
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-secondary)", marginBottom: 4 }}>Approval Rating</div>
        <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, color: approvalColor }}>{Math.round(stats.approvalRating)}%</div>
        <div style={{ fontSize: 9, marginTop: 4, color: Math.abs(appDelta) < 0.05 ? "var(--color-text-secondary)" : appDelta > 0 ? "#1D9E75" : "#E24B4A" }}>
          {Math.abs(appDelta) < 0.05 ? "No change" : (appDelta > 0 ? "▲ +" : "▼ ") + appDelta.toFixed(1) + " pts this week"}
        </div>
      </div>
      <div style={{ textAlign: "right", color: "var(--color-text-secondary)", fontSize: 9, lineHeight: 1.8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Week {week}</div>
        <div>Year {yr} · Wk {wiy}</div>
        <div style={{ marginTop: 2 }}>Term {Math.ceil(week / 208)}</div>
      </div>
    </div>

    {/* Main content: map + stats side-by-side */}
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>

      {/* Left: State Map */}
      <div style={{ flex: "1 1 300px", minWidth: 0 }}>
        <div style={{ display: "flex", gap: 3, marginBottom: 6, flexWrap: "wrap" }}>
          {MAP_VIEWS.map(v => (
            <button key={v.id} onClick={() => setMapView(v.id)} style={{
              padding: "3px 10px", fontSize: 10, borderRadius: "var(--border-radius-md)", cursor: "pointer",
              fontWeight: mapView === v.id ? 600 : 400,
              background: mapView === v.id ? "var(--color-background-secondary)" : "transparent",
              color: mapView === v.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              border: mapView === v.id ? "0.5px solid var(--color-border-secondary)" : "0.5px solid transparent",
            }}>{v.label}</button>
          ))}
        </div>
        <TileMap stateApprovals={sA} hoveredState={hov} setHoveredState={setHov} stateHistory={stateHist} dataView={mapView} />
        <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "4px 0 4px", flexWrap: "wrap" }}>
          {(LEGENDS[mapView] || []).map(([c, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 10, height: 7, background: c, borderRadius: 2 }} />
              <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{l}</span>
            </div>
          ))}
        </div>
        {activeBill && <div style={{ marginTop: 8 }}><BillProgress bill={activeBill} passLikelihood={billLikelihood} /></div>}
      </div>

      {/* Right: Stats */}
      <div style={{ flex: "1 1 360px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <SectionHeader label="Economy" />
        {renderStatGroup("Output", ["gdpGrowth", "nominalGdp"])}
        <div style={panelStyle}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 8 }}>GDP per capita</div>
          {(() => {
            const gpc = stats.nominalGdp * 1e12 / stats.population;
            const pgpc = prev.nominalGdp * 1e12 / prev.population;
            const d = gpc - pgpc;
            const chg = Math.abs(d) > 50;
            return (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)" }}>${Math.round(gpc).toLocaleString()}</div>
                  {chg && <div style={{ fontSize: 10, marginTop: 4, color: d > 0 ? "#1D9E75" : "#E24B4A" }}>{d > 0 ? "+" : ""}{Math.round(d).toLocaleString()} this week</div>}
                </div>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textAlign: "right" }}>
                  <div>Nominal GDP scaled by population</div>
                </div>
              </div>
            );
          })()}
        </div>
        {renderStatGroup("Prices & Labor", ["unemployment", "inflation", "gasPrice", "tradeBalance", "housingStarts"])}

        <SectionHeader label="Federal Reserve" />
        <div style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12 }}>
            <div>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)" }}>Chair</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)" }}>{macroState.fedChairName}</div>
              <div style={{ marginTop: 5 }}>
                <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-secondary)", textTransform: "capitalize" }}>
                  {macroState.governorPersonality.toLowerCase()}
                </span>
              </div>
            </div>
            <div style={{ flex: "0 0 180px" }}>
              <StatCard statKey="fedFundsRate" value={stats.fedFundsRate} history={hist.fedFundsRate} prevValue={prev.fedFundsRate} />
            </div>
          </div>
          <div style={{ fontSize: 10, lineHeight: 1.55, color: "var(--color-text-secondary)" }}>
            {macroState.fedDecisionSummary}
          </div>
        </div>

        <SectionHeader label="Society" />
        {/* Population hero */}
        {(() => {
          const popDelta = stats.population - prev.population;
          const chg = Math.abs(popDelta) > 100;
          return (
            <div style={{ ...panelStyle, padding: "10px 14px", marginBottom: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 2 }}>Total Population</div>
                <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: "var(--color-text-primary)" }}>{stats.population.toLocaleString()}</div>
                {chg && <div style={{ fontSize: 9, marginTop: 3, color: "#1D9E75" }}>▲ +{popDelta.toLocaleString()} this period</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>({(stats.population / 1e6).toFixed(2)}M)</div>
              </div>
            </div>
          );
        })()}
        {renderStatGroup("Demographics", ["birthRate", "deathRate", "immigrationRate"])}
        {renderStatGroup("Public Safety", ["crimeRate"])}

        <SectionHeader label="Fiscal" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
          <div style={panelStyle}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 8 }}>Revenue & debt</div>
            <div style={cardGridStyle}>
              <StatCard statKey="taxRevenue" value={stats.taxRevenue} history={hist.taxRevenue} prevValue={prev.taxRevenue} />
              <StatCard statKey="nationalDebt" value={stats.nationalDebt} history={hist.nationalDebt} prevValue={prev.nationalDebt} />
            </div>
          </div>
          <div style={{ ...panelStyle, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 1 }}>Annual deficit</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: defColor }}>{SM.nationalDeficit.f(stats.nationalDeficit)}</div>
            {Math.abs((stats.nationalDeficit || 0) - (prev.nationalDeficit || 0)) > 1 && (
              <div style={{ fontSize: 10, marginTop: 4, color: stats.nationalDeficit < prev.nationalDeficit ? "#1D9E75" : "#E24B4A" }}>
                {stats.nationalDeficit < prev.nationalDeficit ? "↓" : "↑"} {Math.abs(Math.round(stats.nationalDeficit - prev.nationalDeficit))}B
              </div>
            )}
          </div>
        </div>

        <SectionHeader label="Tax Rates" />
        <div style={panelStyle}>
          {[
            ["Corporate",       stats.corporateTaxRate, prev.corporateTaxRate],
            ["Income <$50k",    stats.incomeTaxLow,     prev.incomeTaxLow],
            ["Income <$200k",   stats.incomeTaxMid,     prev.incomeTaxMid],
            ["Income >$200k",   stats.incomeTaxHigh,    prev.incomeTaxHigh],
            ["Payroll",         stats.payrollTaxRate,   prev.payrollTaxRate],
          ].map(([label, val, pval]) => {
            const d = val - pval;
            const chg = Math.abs(d) > 0.01;
            return (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: "0.5px solid var(--color-border-secondary)" }}>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {val.toFixed(val % 1 === 0 ? 0 : 2)}%
                  {chg && <span style={{ fontSize: 9, marginLeft: 4, color: d > 0 ? "#E24B4A" : "#1D9E75" }}>{d > 0 ? "▲" : "▼"}</span>}
                </span>
              </div>
            );
          })}
        </div>

        <SectionHeader label="Budget" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
          <div style={panelStyle}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 4 }}>Mandatory</div>
            {[
              ["Healthcare", stats.healthcareSpending, prev.healthcareSpending],
              ["Social Security", stats.socialSecuritySpending, prev.socialSecuritySpending],
            ].map(([label, val, pval]) => renderBudgetRow(label, val, pval))}
          </div>
          <div style={panelStyle}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 4 }}>Discretionary</div>
            {[
              ["Defense", stats.militarySpending, prev.militarySpending],
              ["Education", stats.educationSpending, prev.educationSpending],
              ["Infrastructure", stats.infrastructureSpending, prev.infrastructureSpending],
            ].map(([label, val, pval]) => renderBudgetRow(label, val, pval))}
            {renderBudgetRow("Other", stats.otherSpending, prev.otherSpending, {
              children: otherBreakdown,
              expanded: otherExpanded,
              onToggle: () => setOtherExpanded(v => !v),
            })}
          </div>
        </div>
      </div>

    </div>
  </>;
}
