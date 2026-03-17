import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { STATE_DATA } from "../data/states.js";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const FIPS = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE",
  "11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA",
  "20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN",
  "28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM",
  "36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI",
  "45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA",
  "54":"WV","55":"WI","56":"WY",
};

const LENS_OPTIONS = [
  { id: "education",    label: "Education" },
  { id: "urbanization", label: "Urban" },
  { id: "religiosity",  label: "Religious" },
  { id: "approval",     label: "Approval" },
  { id: "swing",        label: "Swing" },
];

function lensColor(lens, st, approval) {
  switch (lens) {
    case "education": {
      const e = st.education;
      if (e >= 0.75) return "#1d4ed8";
      if (e >= 0.65) return "#2563eb";
      if (e >= 0.58) return "#3b82f6";
      if (e >= 0.52) return "#60a5fa";
      if (e >= 0.46) return "#93c5fd";
      return "#dbeafe";
    }
    case "urbanization": {
      const u = st.urbanization;
      if (u >= 0.90) return "#5b21b6";
      if (u >= 0.78) return "#7c3aed";
      if (u >= 0.68) return "#8b5cf6";
      if (u >= 0.57) return "#a78bfa";
      if (u >= 0.47) return "#c4b5fd";
      return "#ede9fe";
    }
    case "religiosity": {
      const r = st.religiosity;
      if (r >= 0.75) return "#b45309";
      if (r >= 0.65) return "#d97706";
      if (r >= 0.55) return "#f59e0b";
      if (r >= 0.45) return "#fbbf24";
      if (r >= 0.35) return "#fde68a";
      return "#fef9c3";
    }
    case "approval": {
      const a = approval || 50;
      if (a > 58) return "#1D9E75";
      if (a > 52) return "#5DCAA5";
      if (a > 48) return "#9FE1CB";
      if (a > 44) return "#EF9F27";
      if (a > 38) return "#D85A30";
      return "#E24B4A";
    }
    case "swing": {
      const lean = st.lean;
      if (lean > 0.60) return "#c0392b";
      if (lean > 0.54) return "#e74c3c";
      if (lean > 0.51) return "#f1948a";
      if (lean < 0.40) return "#1a5276";
      if (lean < 0.46) return "#2980b9";
      if (lean < 0.49) return "#7fb3d3";
      return "#9FE1CB";
    }
    default: return "#93c5fd";
  }
}

const LENS_LEGENDS = {
  education:    [["#dbeafe","<46%"],["#93c5fd","46-52"],["#60a5fa","52-58"],["#3b82f6","58-65"],["#2563eb","65-75"],["#1d4ed8",">75%"]],
  urbanization: [["#ede9fe","<47%"],["#c4b5fd","47-57"],["#a78bfa","57-68"],["#8b5cf6","68-78"],["#7c3aed","78-90"],["#5b21b6",">90%"]],
  religiosity:  [["#fef9c3","<35%"],["#fde68a","35-45"],["#fbbf24","45-55"],["#f59e0b","55-65"],["#d97706","65-75"],["#b45309",">75%"]],
  approval:     [["#E24B4A","<38%"],["#D85A30","38-44"],["#EF9F27","44-48"],["#9FE1CB","48-52"],["#5DCAA5","52-58"],["#1D9E75",">58%"]],
  swing:        [["#1a5276","Strong D"],["#2980b9","Lean D"],["#7fb3d3","Tilt D"],["#9FE1CB","Swing"],["#f1948a","Tilt R"],["#e74c3c","Lean R"],["#c0392b","Strong R"]],
};

const LENS_TOOLTIPS = {
  education:    st => `Education: ${Math.round(st.education * 100)}% college`,
  urbanization: st => `Urban: ${Math.round(st.urbanization * 100)}%`,
  religiosity:  st => `Religiosity: ${Math.round(st.religiosity * 100)}%`,
  approval:     (st, app) => `Approval: ${Math.round(app || 50)}%`,
  swing: st => `Lean: ${(Math.round((st.lean - 0.5) * 100) > 0 ? "R+" : "D+")}${Math.abs(Math.round((st.lean - 0.5) * 100))}`,
};

export default function VisitMap({ selectedState, setSelectedState, stateApprovals, disabledStates = new Set() }) {
  const [hoveredState, setHoveredState] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [lens, setLens] = useState("education");

  const hs = hoveredState ? STATE_DATA.find(s => s.abbr === hoveredState) : null;

  const handleMouseMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div>
      {/* Lens toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
        {LENS_OPTIONS.map(opt => (
          <button key={opt.id} onClick={() => setLens(opt.id)} style={{
            padding: "3px 10px", fontSize: 10, fontWeight: lens === opt.id ? 600 : 400,
            background: lens === opt.id ? "var(--color-text-primary)" : "var(--color-background-secondary)",
            color: lens === opt.id ? "var(--color-background-primary)" : "var(--color-text-secondary)",
            border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer",
          }}>{opt.label}</button>
        ))}
      </div>

      <div style={{ position: "relative" }} onMouseMove={handleMouseMove}>
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          width={800}
          height={500}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                const fips = geo.id;
                const abbr = FIPS[fips];
                if (!abbr) return null;
                const st = STATE_DATA.find(s => s.abbr === abbr);
                if (!st) return null;
                const isSelected = selectedState === abbr;
                const isDisabled = disabledStates.has(abbr);
                const fill = isDisabled ? "#d1d5db" : lensColor(lens, st, stateApprovals && stateApprovals[abbr]);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => setHoveredState(abbr)}
                    onMouseLeave={() => setHoveredState(null)}
                    onClick={() => { if (!isDisabled) setSelectedState(abbr === selectedState ? "" : abbr); }}
                    style={{
                      default: {
                        fill,
                        stroke: isSelected ? "#0f172a" : "rgba(255,255,255,0.5)",
                        strokeWidth: isSelected ? 2 : 0.5,
                        outline: "none",
                        opacity: isDisabled ? 0.4 : 1,
                      },
                      hover: { fill, stroke: isDisabled ? "rgba(255,255,255,0.5)" : "#0f172a", strokeWidth: isDisabled ? 0.5 : 1.5, outline: "none", cursor: isDisabled ? "not-allowed" : "pointer", opacity: isDisabled ? 0.4 : 1 },
                      pressed: { fill, outline: "none", opacity: isDisabled ? 0.4 : 1 },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {/* Tooltip */}
        {hs && (
          <div style={{
            position: "absolute",
            left: Math.min(tooltipPos.x + 12, 380),
            top: tooltipPos.y - 10,
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            padding: "8px 12px",
            fontSize: 11,
            zIndex: 10,
            minWidth: 150,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            pointerEvents: "none",
            transform: "translateY(-50%)",
          }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: "var(--color-text-primary)", marginBottom: 4 }}>{hs.name}</div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 2 }}>
              {LENS_TOOLTIPS[lens](hs, stateApprovals && stateApprovals[hs.abbr])}
            </div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 3 }}>
              Edu {Math.round(hs.education * 100)}% · Urban {Math.round(hs.urbanization * 100)}% · Faith {Math.round(hs.religiosity * 100)}%
            </div>
            <div style={{ fontSize: 10, color: disabledStates.has(hs.abbr) ? "#ef4444" : "#2563eb" }}>
              {disabledStates.has(hs.abbr) ? "Not available for this activity" : "Click to select"}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
        {(LENS_LEGENDS[lens] || []).map(([c, l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 10, height: 7, background: c, borderRadius: 2 }} />
            <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
