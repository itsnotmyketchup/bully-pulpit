import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { STCOL } from "../../data/countries.js";
import { COUNTRY_FACTION_EFFECTS } from "../../data/constants.js";
import Badge from "../Badge.jsx";
import DualMeter from "../DualMeter.jsx";

const WORLD_GEO = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO numeric → game country id
const ISO_TO_ID = {
  "826": "uk", "250": "france", "276": "germany", "124": "canada",
  "392": "japan", "036": "australia", "410": "south_korea", "376": "israel",
  "356": "india", "076": "brazil", "484": "mexico", "682": "saudi",
  "818": "egypt", "156": "china", "643": "russia", "364": "iran", "408": "north_korea",
};

// UN Security Council P5 permanent members
const UNSC_PERMANENT = new Set(["826", "250", "156", "643", "840"]); // UK, France, China, Russia, USA

// NATO member ISO numeric codes (as of 2025)
const NATO_ISO = new Set([
  "008", "056", "100", "124", "191", "203", "208", "233", "246",
  "250", "276", "300", "348", "352", "380", "428", "440", "442",
  "499", "528", "578", "616", "620", "642", "703", "705", "724",
  "752", "792", "826", "840",
]);
// NATO countries that exist as interactable game countries
const NATO_INTERACTABLE = new Set(["uk", "france", "germany", "canada"]);

const MAP_MODES = [
  { id: "relations", label: "Relations" },
  { id: "unsc", label: "UN Security Council" },
  { id: "nato", label: "NATO Allies" },
];

function WorldMap({ countries, mode }) {
  const [hovId, setHovId] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const countryMap = Object.fromEntries(countries.map(c => [c.id, c]));
  const hovCountry = hovId ? countryMap[hovId] : null;

  const getFill = (isoId, cid) => {
    if (mode === "unsc") {
      if (UNSC_PERMANENT.has(isoId)) return "#1565C0";
      return "var(--color-background-tertiary)";
    }
    if (mode === "nato") {
      if (!NATO_ISO.has(isoId)) return "var(--color-background-tertiary)";
      if (cid && NATO_INTERACTABLE.has(cid)) return "#1A237E";
      return "#5C8AE8";
    }
    const country = cid ? countryMap[cid] : null;
    return country ? STCOL[country.status] : "var(--color-background-tertiary)";
  };

  const getLegend = () => {
    if (mode === "unsc") return [
      { color: "#1565C0", label: "P5 Permanent" },
    ];
    if (mode === "nato") return [
      { color: "#1A237E", label: "NATO (interactable)" },
      { color: "#5C8AE8", label: "NATO (observer)" },
    ];
    return Object.entries(STCOL).map(([s, c]) => ({ color: c, label: s.charAt(0) + s.slice(1).toLowerCase() }));
  };

  const handleMouseMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div style={{ position: "relative", marginBottom: 16 }} onMouseMove={handleMouseMove}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 100, center: [15, 20] }}
        width={800} height={380}
        style={{ width: "100%", height: "auto", display: "block", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)" }}
      >
        <Geographies geography={WORLD_GEO}>
          {({ geographies }) => geographies.map(geo => {
            const isoId = String(geo.id).padStart(3, "0");
            const cid = ISO_TO_ID[isoId];
            const fill = getFill(isoId, cid);
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                onMouseEnter={() => cid && setHovId(cid)}
                onMouseLeave={() => setHovId(null)}
                style={{
                  default: { fill, stroke: "rgba(255,255,255,0.15)", strokeWidth: 0.3, outline: "none" },
                  hover: { fill, stroke: cid ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.15)", strokeWidth: cid ? 1 : 0.3, outline: "none", cursor: cid ? "pointer" : "default" },
                  pressed: { fill, outline: "none" },
                }}
              />
            );
          })}
        </Geographies>
      </ComposableMap>

      {hovCountry && (
        <div style={{
          position: "absolute",
          left: Math.min(tooltipPos.x + 12, 500),
          top: Math.max(4, tooltipPos.y - 60),
          background: "var(--color-background-primary)",
          border: `1px solid ${STCOL[hovCountry.status]}`,
          borderRadius: "var(--border-radius-lg)",
          padding: "10px 14px",
          zIndex: 20,
          minWidth: 160,
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          pointerEvents: "none",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{hovCountry.name}</span>
            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: `${STCOL[hovCountry.status]}22`, color: STCOL[hovCountry.status], fontWeight: 600 }}>{hovCountry.status}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 12px", fontSize: 11, color: "var(--color-text-secondary)" }}>
            <span>Relationship</span>
            <span style={{ textAlign: "right", fontWeight: 500, color: hovCountry.relationship >= 60 ? "#1D9E75" : hovCountry.relationship < 30 ? "#E24B4A" : "var(--color-text-primary)" }}>{hovCountry.relationship}</span>
            <span>Trust</span>
            <span style={{ textAlign: "right", fontWeight: 500, color: hovCountry.trust >= 60 ? "#1D9E75" : hovCountry.trust < 30 ? "#E24B4A" : "var(--color-text-primary)" }}>{hovCountry.trust}</span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6, justifyContent: "center" }}>
        {getLegend().map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 7, background: color, borderRadius: 2 }} />
            <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const engLabel  = v => v <= 10 ? "isolated" : v <= 20 ? "disengaged" : v <= 30 ? "moderately engaged" : v <= 40 ? "actively engaged" : "highly engaged";
const projLabel = v => v <= 10 ? "marginalized" : v <= 20 ? "a regional power" : v <= 30 ? "a significant power" : v <= 40 ? "a major power" : "globally dominant";
const tensLabel = v => v <= 10 ? "stable" : v <= 20 ? "low" : v <= 30 ? "moderate" : v <= 40 ? "high" : "critical";

function MetricBar({ value, color, label, sentence }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{value}/50</span>
      </div>
      <div style={{ height: 6, background: "var(--color-background-tertiary)", borderRadius: 3, overflow: "hidden", marginBottom: 5 }}>
        <div style={{ height: "100%", width: `${(value / 50) * 100}%`, background: color, borderRadius: 3, transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontStyle: "italic" }}>{sentence}</div>
    </div>
  );
}

export default function DiplomacyTab({ countries, visitedCountries, act, week, factions, onForeignVisit, engagement, powerProjection, globalTension }) {
  const [mapMode, setMapMode] = useState("relations");

  const alliedCountries = countries.filter(c => c.status === "ALLIED");
  const avgAlliedRel = alliedCountries.length
    ? Math.round(alliedCountries.reduce((s, c) => s + c.relationship, 0) / alliedCountries.length)
    : 0;
  const avgIntlRel = countries.length
    ? Math.round(countries.reduce((s, c) => s + c.relationship, 0) / countries.length)
    : 0;

  const tensionColor = globalTension > 35 ? "#E24B4A" : globalTension > 20 ? "#EF9F27" : "#1D9E75";

  return <>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>

    {/* Left: World map + perception metrics */}
    <div style={{ flex: "1 1 320px", minWidth: 0 }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
        {MAP_MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMapMode(m.id)}
            style={{
              fontSize: 10, padding: "3px 10px", borderRadius: 4,
              border: mapMode === m.id ? "1px solid var(--color-text-primary)" : "1px solid var(--color-border-tertiary)",
              background: mapMode === m.id ? "var(--color-text-primary)" : "var(--color-background-secondary)",
              color: mapMode === m.id ? "var(--color-background-primary)" : "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >{m.label}</button>
        ))}
      </div>
      <WorldMap countries={countries} mode={mapMode} />

      {/* International Perception Metrics */}
      <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>International Perception</div>

        <MetricBar
          value={engagement} color="#378ADD" label="Engagement"
          sentence={<>The United States is perceived as being <span style={{ color: "#378ADD", fontStyle: "normal", fontWeight: 600 }}>{engLabel(engagement)}</span>.</>}
        />
        <MetricBar
          value={powerProjection} color="#EF9F27" label="Power Projection"
          sentence={<>The United States is perceived as being <span style={{ color: "#EF9F27", fontStyle: "normal", fontWeight: 600 }}>{projLabel(powerProjection)}</span>.</>}
        />
        <MetricBar
          value={globalTension} color={tensionColor} label="Global Tension"
          sentence={<>Global tension is currently <span style={{ color: tensionColor, fontStyle: "normal", fontWeight: 600 }}>{tensLabel(globalTension)}</span>.</>}
        />

        {/* Avg relationship stats */}
        <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 10, marginTop: 4, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
          <div>
            <div style={{ fontSize: 9, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Allied Relations</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: avgAlliedRel >= 70 ? "#1D9E75" : avgAlliedRel >= 50 ? "#378ADD" : "#EF9F27" }}>{avgAlliedRel}<span style={{ fontSize: 9, color: "var(--color-text-secondary)", fontWeight: 400 }}>/100</span></div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>International Avg</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: avgIntlRel >= 60 ? "#1D9E75" : avgIntlRel >= 40 ? "#378ADD" : "#EF9F27" }}>{avgIntlRel}<span style={{ fontSize: 9, color: "var(--color-text-secondary)", fontWeight: 400 }}>/100</span></div>
          </div>
        </div>

        {/* Faction effect hints — dynamic based on current metric values */}
        {(() => {
          const effects = {};
          const add = (fids, delta) => fids.forEach(fid => { effects[fid] = (effects[fid] || 0) + delta; });
          if (engagement > 30) add(['prog', 'mod_dem', 'blue_dog', 'mod_rep'], 0.3);
          if (engagement < 20) add(['freedom'], 0.3);
          if (powerProjection > 38) add(['mod_rep', 'trad_con', 'blue_dog'], 0.3);
          if (powerProjection < 32) add(['prog'], 0.3);
          if (globalTension > 35) add(['prog'], -0.5);
          const active = Object.entries(effects).filter(([, v]) => v !== 0);
          if (active.length === 0) return null;
          return (
            <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 8, marginTop: 8 }}>
              <div style={{ fontSize: 9, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Faction effects</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 8px" }}>
                {active.map(([fid, v]) => {
                  const f = factions[fid];
                  if (!f) return null;
                  const color = v > 0 ? "#1D9E75" : "#E24B4A";
                  return (
                    <span key={fid} style={{ fontSize: 9, color }}>
                      {v > 0 ? "+" : ""}{v.toFixed(1)}/wk {f.name.split(" ")[0]}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </div>

    {/* Right: Country list */}
    <div style={{ flex: "1 1 260px", minWidth: 0 }}>
    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 8 }}>Foreign relations</div>
    {["Europe", "Americas", "Asia-Pacific", "Middle East", "Africa"].map(region => {
      const rc = countries.filter(c => c.region === region);
      if (rc.length === 0) return null;
      const actionCost = region === "Americas" ? 2 : 3;
      return (
        <div key={region} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>{region}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 5 }}>
            {rc.map(c => {
              const isHostile = c.status === "HOSTILE";
              const fxHints = COUNTRY_FACTION_EFFECTS[c.id];
              return (
                <div key={c.id} style={{ padding: "8px 10px", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{c.name}</span>
                    <Badge color={STCOL[c.status]}>{c.status}</Badge>
                  </div>
                  <DualMeter trust={c.trust} relationship={c.relationship} color={STCOL[c.status]} />
                  {fxHints && (
                    <div style={{ fontSize: 8, color: "var(--color-text-secondary)", marginTop: 2 }}>
                      {Object.entries(fxHints).map(([fid, v]) => {
                        const f = factions[fid];
                        return f ? (
                          <span key={fid} style={{ marginRight: 4, color: v > 0 ? "#1D9E75" : "#E24B4A" }}>
                            {f.name.split(" ")[0]}: {v > 0 ? "+" : ""}{Math.round(v * 8)}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  {!isHostile && (() => {
                    const onCooldown = visitedCountries[c.id] && week < visitedCountries[c.id];
                    const cooldownWeeks = onCooldown ? Math.max(0, visitedCountries[c.id] - week) : 0;
                    const visitDisabled = act + actionCost > 4 || onCooldown;
                    return (
                      <div style={{ display: "flex", gap: 3, marginTop: 5, flexWrap: "wrap" }}>
                        <button onClick={() => onForeignVisit(c.id)} disabled={visitDisabled} style={{
                          fontSize: 9, padding: "2px 7px", borderRadius: 4, border: "none",
                          cursor: visitDisabled ? "not-allowed" : "pointer",
                          background: visitDisabled ? "var(--color-background-tertiary)" : "var(--color-text-primary)",
                          color: visitDisabled ? "var(--color-text-secondary)" : "var(--color-background-primary)",
                        }}>Visit ({actionCost} actions)</button>
                        {onCooldown && <span style={{ fontSize: 9, color: "#EF9F27", alignSelf: "center" }}>CD: {cooldownWeeks}w</span>}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      );
    })}
    </div>

    </div>
  </>;
}
