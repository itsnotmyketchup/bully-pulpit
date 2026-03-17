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

export default function OverviewTab({ stats, prev, hist, sA, stateHist, hov, setHov, activeBill, billLikelihood, week }) {
  const [mapView, setMapView] = useState("approval");
  const yr = Math.ceil(week / 52);
  const wiy = ((week - 1) % 52) + 1;
  const appDelta = stats.approvalRating - prev.approvalRating;
  const approvalColor = stats.approvalRating >= 55 ? "#1D9E75" : stats.approvalRating < 42 ? "#E24B4A" : "var(--color-text-primary)";
  const defColor = stats.nationalDeficit < 0 ? "#1D9E75" : stats.nationalDeficit > 2500 ? "#E24B4A" : stats.nationalDeficit > 1800 ? "#EF9F27" : "var(--color-text-primary)";

  return <>
    {/* Approval Hero */}
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 16px", marginBottom: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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

    {/* State Map */}
    <div style={{ marginBottom: 4 }}>
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
      {mapView === "approval" && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "4px 0 6px", flexWrap: "wrap" }}>
          {[["#E24B4A", "<38%"], ["#D85A30", "38-44"], ["#EF9F27", "44-48"], ["#9FE1CB", "48-52"], ["#5DCAA5", "52-58"], ["#1D9E75", ">58%"]].map(([c, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 10, height: 7, background: c, borderRadius: 2 }} />
              <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{l}</span>
            </div>
          ))}
        </div>
      )}
      {mapView === "partisanship" && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "4px 0 6px", flexWrap: "wrap" }}>
          {[["#c0392b", "Strong R"], ["#e74c3c", "Lean R"], ["#f1948a", "Tilt R"], ["#7fb3d3", "Tilt D"], ["#2980b9", "Lean D"], ["#1a5276", "Strong D"]].map(([c, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 10, height: 7, background: c, borderRadius: 2 }} />
              <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{l}</span>
            </div>
          ))}
        </div>
      )}
      {mapView === "education" && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "4px 0 6px", flexWrap: "wrap" }}>
          {[["#dbeafe","<46%"],["#93c5fd","46-52"],["#60a5fa","52-58"],["#3b82f6","58-65"],["#2563eb","65-75"],["#1d4ed8",">75%"]].map(([c, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 10, height: 7, background: c, borderRadius: 2 }} />
              <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{l}</span>
            </div>
          ))}
        </div>
      )}
      {mapView === "urban" && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "4px 0 6px", flexWrap: "wrap" }}>
          {[["#ede9fe","<47%"],["#c4b5fd","47-57"],["#a78bfa","57-68"],["#8b5cf6","68-78"],["#7c3aed","78-90"],["#5b21b6",">90%"]].map(([c, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 10, height: 7, background: c, borderRadius: 2 }} />
              <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{l}</span>
            </div>
          ))}
        </div>
      )}
      {mapView === "religious" && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "4px 0 6px", flexWrap: "wrap" }}>
          {[["#fef9c3","<35%"],["#fde68a","35-45"],["#fbbf24","45-55"],["#f59e0b","55-65"],["#d97706","65-75"],["#b45309",">75%"]].map(([c, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 10, height: 7, background: c, borderRadius: 2 }} />
              <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{l}</span>
            </div>
          ))}
        </div>
      )}
    </div>

    <SectionHeader label="Economy" />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
      {["gdpGrowth", "unemployment", "inflation", "gasPrice", "tradeBalance"].map(k => (
        <StatCard key={k} statKey={k} value={stats[k]} history={hist[k]} prevValue={prev[k]} />
      ))}
    </div>

    <SectionHeader label="Society" />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
      {["crimeRate", "immigrationRate"].map(k => (
        <StatCard key={k} statKey={k} value={stats[k]} history={hist[k]} prevValue={prev[k]} />
      ))}
    </div>

    <SectionHeader label="Fiscal" />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
      <StatCard statKey="nationalDebt" value={stats.nationalDebt} history={hist.nationalDebt} prevValue={prev.nationalDebt} />
      <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", minWidth: 0 }}>
        <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 1 }}>Annual deficit</div>
        <div style={{ fontSize: 17, fontWeight: 500, color: defColor }}>{SM.nationalDeficit.f(stats.nationalDeficit)}</div>
        {Math.abs((stats.nationalDeficit || 0) - (prev.nationalDeficit || 0)) > 1 && (
          <div style={{ fontSize: 9, color: stats.nationalDeficit < prev.nationalDeficit ? "#1D9E75" : "#E24B4A" }}>
            {stats.nationalDeficit < prev.nationalDeficit ? "↓" : "↑"} {Math.abs(Math.round(stats.nationalDeficit - prev.nationalDeficit))}B
          </div>
        )}
      </div>
    </div>

    <SectionHeader label="Tax Rates" />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
      {["corporateTaxRate", "incomeTaxLow", "incomeTaxMid", "incomeTaxHigh", "payrollTaxRate"].map(k => (
        <StatCard key={k} statKey={k} value={stats[k]} history={hist[k]} prevValue={prev[k]} />
      ))}
    </div>

    <SectionHeader label="Budget" />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>
      {["militarySpending", "educationSpending", "healthcareSpending", "infrastructureSpending"].map(k => (
        <StatCard key={k} statKey={k} value={stats[k]} history={hist[k]} prevValue={prev[k]} />
      ))}
    </div>

    {activeBill && <div style={{ marginTop: 10 }}><BillProgress bill={activeBill} passLikelihood={billLikelihood} /></div>}
  </>;
}
