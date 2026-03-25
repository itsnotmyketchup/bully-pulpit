import { useState } from "react";
import StatCard from "../StatCard.jsx";
import BillProgress from "../BillProgress.jsx";
import TileMap from "../TileMap.jsx";
import SectionHeader from "../SectionHeader.jsx";
import { SM } from "../../data/stats.js";
import { getTotalFederalSpending } from "../../logic/macroEconomy.js";

const MAP_VIEWS = [
  { id: "approval", label: "Approval" },
  { id: "partisanship", label: "Partisanship" },
  { id: "education", label: "Education" },
  { id: "urban", label: "Urban" },
  { id: "religious", label: "Religious" },
];

export default function OverviewTab({ stats, prev, hist, sA, stateHist, hov, setHov, activeBills, week, macroState }) {
  const [mapView, setMapView] = useState("approval");
  const [otherExpanded, setOtherExpanded] = useState(false);
  const yr = Math.ceil(week / 52);
  const wiy = ((week - 1) % 52) + 1;
  const appDelta = stats.approvalRating - prev.approvalRating;
  const approvalColor = stats.approvalRating >= 55 ? "#1D9E75" : stats.approvalRating < 42 ? "#E24B4A" : "var(--color-text-primary)";
  const defColor = stats.nationalDeficit < 0 ? "#1D9E75" : stats.nationalDeficit > 2500 ? "#E24B4A" : stats.nationalDeficit > 1800 ? "#EF9F27" : "var(--color-text-primary)";
  const successColor = "#1D9E75";
  const dangerColor = "#E24B4A";
  const totalFederalBudget = getTotalFederalSpending(stats);
  const prevTotalFederalBudget = getTotalFederalSpending(prev);
  const otherBreakdown = [
    ["Science & Technology", stats.scienceTechnologySpending],
    ["Law Enforcement", stats.lawEnforcementSpending],
    ["Agriculture", stats.agricultureSpending],
    ["Energy & Environment", stats.energyEnvironmentSpending],
    ["IRS", stats.irsFunding],
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
    border: "1px solid var(--color-border-secondary)",
    boxShadow: "var(--shadow-sm)",
  };

  const insetPanelStyle = {
    background: "var(--color-background-tertiary)",
    borderRadius: "var(--border-radius-md)",
    border: "1px solid var(--color-border-tertiary)",
  };

  const cardGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))",
    gap: 8,
  };

  const columnStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 0,
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
            {chg && <span style={{ fontSize: 9, marginLeft: 4, color: d > 0 ? successColor : dangerColor }}>{d > 0 ? "▲" : "▼"} {Math.abs(Math.round(d))}B</span>}
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

  const powerMix = [
    { key: "powerHydroShare", label: "Hydro", value: stats.powerHydroShare, prevValue: prev.powerHydroShare, color: "#4C9AFF" },
    { key: "powerSolarShare", label: "Solar", value: stats.powerSolarShare, prevValue: prev.powerSolarShare, color: "#F4B942" },
    { key: "powerWindShare", label: "Wind", value: stats.powerWindShare, prevValue: prev.powerWindShare, color: "#38B2AC" },
    { key: "powerCoalShare", label: "Coal", value: stats.powerCoalShare, prevValue: prev.powerCoalShare, color: "#5B5F6A" },
    { key: "powerNuclearShare", label: "Nuclear", value: stats.powerNuclearShare, prevValue: prev.powerNuclearShare, color: "#9B7EDE" },
    { key: "powerNaturalGasShare", label: "Natural gas", value: stats.powerNaturalGasShare, prevValue: prev.powerNaturalGasShare, color: "#D97745" },
  ];
  const powerMixGradient = (() => {
    let start = 0;
    const segments = powerMix.map(({ value, color }) => {
      const end = start + value;
      const segment = `${color} ${start}% ${end}%`;
      start = end;
      return segment;
    });
    return `conic-gradient(${segments.join(", ")})`;
  })();

  return <>
    {/* Approval Hero */}
    <div style={{ ...panelStyle, borderRadius: "var(--border-radius-md)", padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-secondary)", marginBottom: 4 }}>Approval Rating</div>
        <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, color: approvalColor }}>{Math.round(stats.approvalRating)}%</div>
        <div style={{ fontSize: 9, marginTop: 4, color: Math.abs(appDelta) < 0.05 ? "var(--color-text-secondary)" : appDelta > 0 ? successColor : dangerColor }}>
          {Math.abs(appDelta) < 0.05 ? "No change" : (appDelta > 0 ? "▲ +" : "▼ ") + appDelta.toFixed(1) + " pts this week"}
        </div>
      </div>
      <div style={{ textAlign: "right", color: "var(--color-text-secondary)", fontSize: 9, lineHeight: 1.8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Week {week}</div>
        <div>Year {yr} · Wk {wiy}</div>
        <div style={{ marginTop: 2 }}>Term {Math.ceil(week / 208)}</div>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: 12, alignItems: "start" }}>
      <div style={columnStyle}>
        <div style={panelStyle}>
          <div style={{ display: "flex", gap: 3, marginBottom: 6, flexWrap: "wrap" }}>
            {MAP_VIEWS.map(v => (
              <button key={v.id} onClick={() => setMapView(v.id)} style={{
                padding: "3px 10px", fontSize: 10, borderRadius: "var(--border-radius-md)", cursor: "pointer",
                fontWeight: mapView === v.id ? 600 : 400,
                background: mapView === v.id ? "var(--color-background-tertiary)" : "transparent",
                color: mapView === v.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                border: mapView === v.id ? "1px solid var(--color-border-secondary)" : "1px solid transparent",
              }}>{v.label}</button>
            ))}
          </div>
          <TileMap stateApprovals={sA} hoveredState={hov} setHoveredState={setHov} stateHistory={stateHist} dataView={mapView} />
          <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "4px 0 0", flexWrap: "wrap" }}>
            {(LEGENDS[mapView] || []).map(([c, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <div style={{ width: 10, height: 7, background: c, borderRadius: 2 }} />
                <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{l}</span>
              </div>
            ))}
          </div>
          {activeBills?.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {activeBills.map((bill) => <BillProgress key={bill.id} bill={bill} />)}
            </div>
          )}
        </div>

        <SectionHeader label="Economy" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
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
                    {chg && <div style={{ fontSize: 10, marginTop: 4, color: d > 0 ? successColor : dangerColor }}>{d > 0 ? "+" : ""}{Math.round(d).toLocaleString()} this week</div>}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textAlign: "right" }}>
                    <div>Nominal GDP scaled by population</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        {renderStatGroup("Prices & Labor", ["unemployment", "inflation", "gasPrice", "tradeBalance", "housingStarts"])}

        <SectionHeader label="Society" />
        {(() => {
          const popDelta = stats.population - prev.population;
          const chg = Math.abs(popDelta) > 100;
          return (
            <div style={{ ...panelStyle, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 2 }}>Total Population</div>
                <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: "var(--color-text-primary)" }}>{stats.population.toLocaleString()}</div>
                {chg && <div style={{ fontSize: 9, marginTop: 3, color: successColor }}>▲ +{popDelta.toLocaleString()} this period</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>({(stats.population / 1e6).toFixed(2)}M)</div>
              </div>
            </div>
          );
        })()}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
          {renderStatGroup("Demographics", ["birthRate", "deathRate", "immigrationRate"])}
          {renderStatGroup("Public Safety", ["crimeRate"])}
        </div>
      </div>

      <div style={columnStyle}>
        <SectionHeader label="Environment" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
          <div style={panelStyle}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 8 }}>U.S. power generation by source</div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 124, height: 124, borderRadius: "50%", background: powerMixGradient, position: "relative", flex: "0 0 auto" }}>
                <div style={{ position: "absolute", inset: 22, borderRadius: "50%", background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 8, boxShadow: "var(--shadow-sm)" }}>
                  <div>
                    <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)" }}>Clean power</div>
                    <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1, color: "var(--color-text-primary)" }}>{Math.round(stats.powerHydroShare + stats.powerSolarShare + stats.powerWindShare)}%</div>
                  </div>
                </div>
              </div>
              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                {powerMix.map(({ key, label, value, prevValue, color }) => {
                  const delta = value - prevValue;
                  return (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: "0.5px solid var(--color-border-secondary)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--color-text-secondary)" }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
                        <span>{label}</span>
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-primary)" }}>
                        {value.toFixed(1)}%
                        {Math.abs(delta) > 0.01 && (
                          <span style={{ fontSize: 9, marginLeft: 4, color: delta > 0 ? successColor : dangerColor }}>
                            {delta > 0 ? "+" : ""}{delta.toFixed(2)}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={panelStyle}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 8 }}>Transition indicators</div>
            <div style={cardGridStyle}>
              <StatCard statKey="evShareNewCars" value={stats.evShareNewCars} history={hist.evShareNewCars} prevValue={prev.evShareNewCars} />
              <StatCard statKey="carbonEmissionsPerCapita" value={stats.carbonEmissionsPerCapita} history={hist.carbonEmissionsPerCapita} prevValue={prev.carbonEmissionsPerCapita} />
            </div>
          </div>
        </div>

        <SectionHeader label="Institutions" />
        <div style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)" }}>Federal Reserve Chair</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)" }}>{macroState.fedChairName}</div>
              <div style={{ marginTop: 5 }}>
                <span style={{ ...insetPanelStyle, display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>
                  {macroState.governorPersonality.toLowerCase()}
                </span>
              </div>
            </div>
            <div style={{ flex: "1 1 180px", minWidth: 180 }}>
              <StatCard statKey="fedFundsRate" value={stats.fedFundsRate} history={hist.fedFundsRate} prevValue={prev.fedFundsRate} />
            </div>
          </div>
          <div style={{ fontSize: 10, lineHeight: 1.55, color: "var(--color-text-secondary)" }}>
            {macroState.fedDecisionSummary}
          </div>
        </div>

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
              <div style={{ fontSize: 10, marginTop: 4, color: stats.nationalDeficit < prev.nationalDeficit ? successColor : dangerColor }}>
                {stats.nationalDeficit < prev.nationalDeficit ? "↓" : "↑"} {Math.abs(Math.round(stats.nationalDeficit - prev.nationalDeficit))}B
              </div>
            )}
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: "0.5px solid var(--color-border-secondary)" }}>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 1 }}>Total federal budget</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>${Math.round(totalFederalBudget)}B</div>
              {Math.abs(totalFederalBudget - prevTotalFederalBudget) > 1 && (
                <div style={{ fontSize: 10, marginTop: 4, color: totalFederalBudget > prevTotalFederalBudget ? dangerColor : successColor }}>
                  {totalFederalBudget > prevTotalFederalBudget ? "↑" : "↓"} {Math.abs(Math.round(totalFederalBudget - prevTotalFederalBudget))}B
                </div>
              )}
            </div>
          </div>
        </div>

        <SectionHeader label="Budget & Taxes" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
          <div style={panelStyle}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 4 }}>Tax rates</div>
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
                    {chg && <span style={{ fontSize: 9, marginLeft: 4, color: d > 0 ? dangerColor : successColor }}>{d > 0 ? "▲" : "▼"}</span>}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={panelStyle}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 4 }}>Mandatory spending</div>
            {[
              ["Healthcare", stats.healthcareSpending, prev.healthcareSpending],
              ["Social Security", stats.socialSecuritySpending, prev.socialSecuritySpending],
            ].map(([label, val, pval]) => renderBudgetRow(label, val, pval))}
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", margin: "10px 0 4px" }}>Discretionary spending</div>
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
