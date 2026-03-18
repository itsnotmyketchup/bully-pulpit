import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { STATE_DATA } from "../data/states.js";
import MiniChart from "./MiniChart.jsx";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const approvalColor = v =>
  v > 58 ? "#1D9E75" : v > 52 ? "#5DCAA5" : v > 48 ? "#9FE1CB" : v > 44 ? "#EF9F27" : v > 38 ? "#D85A30" : "#E24B4A";

const partisanColor = lean =>
  lean > 0.60 ? "#c0392b" : lean > 0.54 ? "#e74c3c" : lean > 0.51 ? "#f1948a" :
  lean < 0.40 ? "#1a5276" : lean < 0.46 ? "#2980b9" : lean < 0.49 ? "#7fb3d3" : "#9FE1CB";

const educationColor = e => {
  if (e >= 0.75) return "#1d4ed8";
  if (e >= 0.65) return "#2563eb";
  if (e >= 0.58) return "#3b82f6";
  if (e >= 0.52) return "#60a5fa";
  if (e >= 0.46) return "#93c5fd";
  return "#dbeafe";
};

const urbanColor = u => {
  if (u >= 0.90) return "#5b21b6";
  if (u >= 0.78) return "#7c3aed";
  if (u >= 0.68) return "#8b5cf6";
  if (u >= 0.57) return "#a78bfa";
  if (u >= 0.47) return "#c4b5fd";
  return "#ede9fe";
};

const religiousColor = r => {
  if (r >= 0.75) return "#b45309";
  if (r >= 0.65) return "#d97706";
  if (r >= 0.55) return "#f59e0b";
  if (r >= 0.45) return "#fbbf24";
  if (r >= 0.35) return "#fde68a";
  return "#fef9c3";
};

/* FIPS → abbreviation lookup */
const FIPS = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE",
  "11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA",
  "20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN",
  "28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM",
  "36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI",
  "45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA",
  "54":"WV","55":"WI","56":"WY",
};

export default function TileMap({ stateApprovals, hoveredState, setHoveredState, stateHistory, dataView = "approval" }) {
  const hs = hoveredState ? STATE_DATA.find(s => s.abbr === hoveredState) : null;
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
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
              const a = stateApprovals[abbr] || 50;
              const sd = STATE_DATA.find(s => s.abbr === abbr);
              const fillColor = dataView === "partisanship" ? partisanColor(sd?.lean ?? 0.5)
                : dataView === "education" ? educationColor(sd?.education ?? 0.5)
                : dataView === "urban" ? urbanColor(sd?.urbanization ?? 0.5)
                : dataView === "religious" ? religiousColor(sd?.religiosity ?? 0.5)
                : approvalColor(a);
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={() => setHoveredState(abbr)}
                  onMouseLeave={() => setHoveredState(null)}
                  style={{
                    default: {
                      fill: fillColor,
                      stroke: "rgba(255,255,255,0.5)",
                      strokeWidth: 0.5,
                      outline: "none",
                    },
                    hover: {
                      fill: fillColor,
                      stroke: "var(--color-text-primary)",
                      strokeWidth: 1.5,
                      outline: "none",
                      cursor: "pointer",
                    },
                    pressed: {
                      fill: fillColor,
                      outline: "none",
                    },
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
          left: Math.min(tooltipPos.x + 12, 400),
          top: tooltipPos.y - 10,
          background: "var(--color-background-primary)",
          border: "1px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "10px 14px",
          fontSize: 11,
          zIndex: 10,
          minWidth: 190,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          pointerEvents: "none",
          transform: "translateY(-50%)",
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-primary)", marginBottom: 4 }}>{hs.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 10px", color: "var(--color-text-secondary)", marginBottom: 6 }}>
            <span>Approval</span>
            <span style={{ fontWeight: 500, color: (stateApprovals[hs.abbr] || 50) > 50 ? "#1D9E75" : "#E24B4A", textAlign: "right" }}>
              {Math.round(stateApprovals[hs.abbr] || 50)}%
            </span>
            {dataView === "partisanship" && <>
              <span>Partisan lean</span>
              <span style={{ textAlign: "right", fontWeight: 500, color: hs.lean > 0.52 ? "#e74c3c" : hs.lean < 0.48 ? "#2980b9" : "var(--color-text-primary)" }}>
                {hs.lean > 0.52 ? "R+" : hs.lean < 0.48 ? "D+" : "Swing "}{Math.abs(Math.round((hs.lean - 0.5) * 100))}
              </span>
            </>}
            {dataView === "education" && <>
              <span>College ed.</span>
              <span style={{ textAlign: "right", fontWeight: 500 }}>{Math.round((hs.education || 0) * 100)}%</span>
            </>}
            {dataView === "urban" && <>
              <span>Urbanization</span>
              <span style={{ textAlign: "right", fontWeight: 500 }}>{Math.round((hs.urbanization || 0) * 100)}%</span>
            </>}
            {dataView === "religious" && <>
              <span>Religiosity</span>
              <span style={{ textAlign: "right", fontWeight: 500 }}>{Math.round((hs.religiosity || 0) * 100)}%</span>
            </>}
            <span>Population</span><span style={{ textAlign: "right" }}>{hs.pop}M</span>
            <span>Lean</span>
            <span style={{ textAlign: "right" }}>
              {hs.lean > 0.52 ? "R+" : hs.lean < 0.48 ? "D+" : "Swing "}
              {Math.abs(Math.round((hs.lean - 0.5) * 100))}
            </span>
            <span>Economy</span><span style={{ textAlign: "right", textTransform: "capitalize" }}>{hs.economy}</span>
            <span>House seats</span><span style={{ textAlign: "right" }}>{hs.house}</span>
          </div>
          {/* Approval history chart */}
          {stateHistory && stateHistory[hs.abbr] && stateHistory[hs.abbr].length >= 2 && (
            <div>
              <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginBottom: 2 }}>Approval trend</div>
              <MiniChart
                data={stateHistory[hs.abbr]}
                color={(stateApprovals[hs.abbr] || 50) > 50 ? "#1D9E75" : "#E24B4A"}
                w={160}
                h={36}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
