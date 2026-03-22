import { useState } from "react";

const ONGOING_WARS = [
  {
    id: "russia_ukraine",
    name: "Russia–Ukraine War",
    status: "Ongoing",
    started: "February 2022",
    sides: [
      { label: "Russia + Belarus (limited)", color: "#E24B4A" },
      { label: "Ukraine", color: "#378ADD" },
    ],
    desc: "Russia's full-scale invasion of Ukraine continues with active fighting along eastern and southern front lines. The U.S. has provided extensive military and financial aid to Ukraine. Conflict has caused hundreds of thousands of casualties and the displacement of millions.",
    usPosture: "Active military & economic support for Ukraine. Major NATO coordination.",
  },
  {
    id: "war_in_gaza",
    name: "War in Gaza",
    status: "Ongoing",
    started: "October 2023",
    sides: [
      { label: "Israel (IDF)", color: "#378ADD" },
      { label: "Hamas / Palestinian Factions", color: "#E24B4A" },
    ],
    desc: "Israeli military operations in Gaza launched following the Hamas attacks of October 7, 2023. The conflict has resulted in mass civilian casualties and a severe humanitarian crisis. Ceasefire negotiations have repeatedly stalled.",
    usPosture: "Strong security partnership with Israel. Significant international diplomatic pressure.",
  },
];
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { STCOL } from "../../data/countries.js";
import { COUNTRY_FACTION_EFFECTS } from "../../data/constants.js";
import Badge from "../Badge.jsx";
import DualMeter from "../DualMeter.jsx";
import SectionHeader from "../SectionHeader.jsx";

const WORLD_GEO = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const panelStyle = {
  background: "var(--color-background-secondary)",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: "var(--border-radius-lg)",
  overflow: "hidden",
};

const sectionLabelStyle = {
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--color-text-secondary)",
};

const ISO_TO_ID = {
  "826": "uk", "250": "france", "276": "germany", "124": "canada",
  "392": "japan", "036": "australia", "410": "south_korea", "376": "israel",
  "356": "india", "076": "brazil", "484": "mexico", "682": "saudi",
  "818": "egypt", "156": "china", "643": "russia", "364": "iran", "408": "north_korea",
};

const UNSC_PERMANENT = new Set(["826", "250", "156", "643", "840"]);

const NATO_ISO = new Set([
  "008", "056", "100", "124", "191", "203", "208", "233", "246",
  "250", "276", "300", "348", "352", "380", "428", "440", "442",
  "499", "528", "578", "616", "620", "642", "703", "705", "724",
  "752", "792", "826", "840",
]);

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
      if (UNSC_PERMANENT.has(isoId)) return "#315F93";
      return "var(--color-background-tertiary)";
    }
    if (mode === "nato") {
      if (!NATO_ISO.has(isoId)) return "var(--color-background-tertiary)";
      if (cid && NATO_INTERACTABLE.has(cid)) return "#223F66";
      return "#6A8CB7";
    }
    const country = cid ? countryMap[cid] : null;
    return country ? STCOL[country.status] : "var(--color-background-tertiary)";
  };

  const getLegend = () => {
    if (mode === "unsc") return [
      { color: "#315F93", label: "P5 Permanent" },
    ];
    if (mode === "nato") return [
      { color: "#223F66", label: "NATO (interactable)" },
      { color: "#6A8CB7", label: "NATO (observer)" },
    ];
    return Object.entries(STCOL).map(([s, c]) => ({ color: c, label: s.charAt(0) + s.slice(1).toLowerCase() }));
  };

  const handleMouseMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div style={{ position: "relative" }} onMouseMove={handleMouseMove}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 100, center: [15, 20] }}
        width={800}
        height={380}
        style={{ width: "100%", height: "auto", display: "block", background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)" }}
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

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, justifyContent: "center" }}>
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

const engLabel = v => v <= 10 ? "isolated" : v <= 20 ? "disengaged" : v <= 30 ? "moderately engaged" : v <= 40 ? "actively engaged" : "highly engaged";
const projLabel = v => v <= 10 ? "in total retreat" : v <= 20 ? "eclipsed by others" : v <= 30 ? "challenged by others" : v <= 40 ? "the global superpower" : "utterly dominant";
const tensLabel = v => v <= 10 ? "stable" : v <= 20 ? "low" : v <= 30 ? "moderate" : v <= 40 ? "high" : "critical";

function MetricBar({ value, color, label, sentence }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
        <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{Math.round(value)}/50</span>
      </div>
      <div style={{ height: 6, background: "var(--color-background-tertiary)", borderRadius: 3, overflow: "hidden", marginBottom: 5 }}>
        <div style={{ height: "100%", width: `${(value / 50) * 100}%`, background: color, borderRadius: 3, transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontStyle: "italic" }}>{sentence}</div>
    </div>
  );
}

export default function DiplomacyTab({ countries, visitedCountries, act, maxActions, week, factions, onForeignVisit, engagement, powerProjection, globalTension, georgianCrisis }) {
  const [mapMode, setMapMode] = useState("relations");
  const [rightTab, setRightTab] = useState("dossiers");

  const alliedCountries = countries.filter(c => c.status === "ALLIED");
  const avgAlliedRel = alliedCountries.length
    ? Math.round(alliedCountries.reduce((s, c) => s + c.relationship, 0) / alliedCountries.length)
    : 0;
  const avgIntlRel = countries.length
    ? Math.round(countries.reduce((s, c) => s + c.relationship, 0) / countries.length)
    : 0;

  const tensionColor = globalTension > 35 ? "#E24B4A" : globalTension > 20 ? "#C98B2E" : "#1D9E75";

  return <>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 320px", minWidth: 0 }}>
        <div style={panelStyle}>
          <div style={{ padding: "10px 14px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={sectionLabelStyle}>World Affairs</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginTop: 2 }}>International posture map</div>
            </div>
            <div style={{ display: "flex", gap: 2, background: "var(--color-background-tertiary)", borderRadius: "var(--border-radius-md)", padding: 2 }}>
              {MAP_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMapMode(m.id)}
                  style={{
                    fontSize: 9,
                    padding: "3px 10px",
                    borderRadius: "var(--border-radius-md)",
                    border: "none",
                    background: mapMode === m.id ? "var(--color-background-secondary)" : "transparent",
                    color: mapMode === m.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >{m.label}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: "8px 14px 14px" }}>
            <WorldMap countries={countries} mode={mapMode} />
          </div>
        </div>

        <SectionHeader label="International Perception" />
        <div style={{ ...panelStyle, padding: "12px 14px" }}>
          <MetricBar
            value={engagement}
            color="#378ADD"
            label="Engagement"
            sentence={<>The United States is perceived as being <span style={{ color: "#378ADD", fontStyle: "normal", fontWeight: 600 }}>{engLabel(engagement)}</span>.</>}
          />
          <MetricBar
            value={powerProjection}
            color="#C98B2E"
            label="Power Projection"
            sentence={<>The United States is perceived as being <span style={{ color: "#C98B2E", fontStyle: "normal", fontWeight: 600 }}>{projLabel(powerProjection)}</span>.</>}
          />
          <MetricBar
            value={globalTension}
            color={tensionColor}
            label="Global Tension"
            sentence={<>Global tension is currently <span style={{ color: tensionColor, fontStyle: "normal", fontWeight: 600 }}>{tensLabel(globalTension)}</span>.</>}
          />

          <div style={{ borderTop: "0.5px solid var(--color-border-secondary)", paddingTop: 10, marginTop: 4, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
            <div>
              <div style={{ ...sectionLabelStyle, marginBottom: 2 }}>Allied Relations</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: avgAlliedRel >= 70 ? "#1D9E75" : avgAlliedRel >= 50 ? "#378ADD" : "#C98B2E" }}>{avgAlliedRel}<span style={{ fontSize: 9, color: "var(--color-text-secondary)", fontWeight: 400 }}>/100</span></div>
            </div>
            <div>
              <div style={{ ...sectionLabelStyle, marginBottom: 2 }}>International Avg</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: avgIntlRel >= 60 ? "#1D9E75" : avgIntlRel >= 40 ? "#378ADD" : "#C98B2E" }}>{avgIntlRel}<span style={{ fontSize: 9, color: "var(--color-text-secondary)", fontWeight: 400 }}>/100</span></div>
            </div>
          </div>

          {(() => {
            const effects = {};
            const add = (fids, delta) => fids.forEach(fid => { effects[fid] = (effects[fid] || 0) + delta; });
            if (engagement > 30) add(["prog", "mod_dem", "blue_dog", "mod_rep"], 0.05);
            if (engagement < 20) add(["freedom"], 0.1);
            if (powerProjection > 38) add(["mod_rep", "trad_con", "blue_dog"], 0.05);
            if (powerProjection < 32) add(["prog"], 0.1);
            if (globalTension > 35) add(["prog"], -0.2);
            const active = Object.entries(effects).filter(([, v]) => v !== 0);
            if (active.length === 0) return null;
            return (
              <div style={{ borderTop: "0.5px solid var(--color-border-secondary)", paddingTop: 8, marginTop: 8 }}>
                <div style={{ ...sectionLabelStyle, marginBottom: 5 }}>Faction Effects</div>
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

      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        {/* Right panel subtab switcher */}
        <div style={{ display: "flex", gap: 2, marginBottom: 10, background: "var(--color-background-tertiary)", borderRadius: "var(--border-radius-md)", padding: 2, width: "fit-content" }}>
          <button
            onClick={() => setRightTab("dossiers")}
            style={{
              fontSize: 9, padding: "3px 10px",
              borderRadius: "var(--border-radius-md)", border: "none",
              background: rightTab === "dossiers" ? "var(--color-background-secondary)" : "transparent",
              color: rightTab === "dossiers" ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >Country Dossiers</button>
          <button
            onClick={() => setRightTab("crises")}
            style={{
              fontSize: 9, padding: "3px 10px",
              borderRadius: "var(--border-radius-md)", border: "none",
              background: rightTab === "crises" ? "var(--color-background-secondary)" : "transparent",
              color: rightTab === "crises" ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            Crises &amp; Wars
            {georgianCrisis && (
              <span style={{
                fontSize: 7, background: "#E24B4A", color: "#fff",
                borderRadius: 3, padding: "0px 4px", fontWeight: 700, letterSpacing: "0.05em",
              }}>URGENT</span>
            )}
          </button>
        </div>

        {rightTab === "dossiers" && (
          <>
            {["Europe", "Americas", "Asia-Pacific", "Middle East", "Africa"].map(region => {
              const rc = countries.filter(c => c.region === region);
              if (rc.length === 0) return null;
              const actionCost = region === "Americas" ? 2 : 3;
              return (
                <div key={region} style={{ marginBottom: 12 }}>
                  <div style={{ ...sectionLabelStyle, marginBottom: 5 }}>{region}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 5 }}>
                    {rc.map(c => {
                      const isHostile = c.status === "HOSTILE";
                      const fxHints = COUNTRY_FACTION_EFFECTS[c.id];
                      return (
                        <div key={c.id} style={panelStyle}>
                          <div style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>{c.name}</span>
                              <Badge color={STCOL[c.status]}>{c.status}</Badge>
                            </div>
                            <DualMeter trust={c.trust} relationship={c.relationship} color={STCOL[c.status]} />
                            {fxHints && (
                              <div style={{ fontSize: 8, color: "var(--color-text-secondary)", marginTop: 4, lineHeight: 1.45 }}>
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
                              const visitDisabled = act + actionCost > maxActions || onCooldown;
                              return (
                                <div style={{ display: "flex", gap: 3, marginTop: 7, flexWrap: "wrap" }}>
                                  <button onClick={() => onForeignVisit(c.id)} disabled={visitDisabled} style={{
                                    fontSize: 9,
                                    padding: "3px 8px",
                                    borderRadius: "var(--border-radius-md)",
                                    border: "none",
                                    cursor: visitDisabled ? "not-allowed" : "pointer",
                                    background: visitDisabled ? "var(--color-background-tertiary)" : "var(--color-text-primary)",
                                    color: visitDisabled ? "var(--color-text-secondary)" : "var(--color-background-primary)",
                                  }}>Visit ({actionCost} actions)</button>
                                  {onCooldown && <span style={{ fontSize: 9, color: "#C98B2E", alignSelf: "center" }}>CD: {cooldownWeeks}w</span>}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {rightTab === "crises" && (
          <div>
            {/* Active Crises */}
            {georgianCrisis && (
              <>
                <div style={{ ...sectionLabelStyle, marginBottom: 5 }}>Active Crises</div>
                <div style={{
                  ...panelStyle,
                  marginBottom: 12,
                  borderColor: "#E24B4A66",
                  borderLeft: "3px solid #E24B4A",
                }}>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>Georgian Crisis</span>
                      <span style={{
                        fontSize: 7, fontWeight: 800, letterSpacing: "0.12em",
                        color: "#fff", background: "#E24B4A",
                        padding: "2px 6px", borderRadius: 3, textTransform: "uppercase",
                      }}>URGENT</span>
                    </div>
                    <div style={{ display: "flex", gap: 5, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 9, color: "#E24B4A", background: "#E24B4A14", padding: "1px 7px", borderRadius: 3, border: "0.5px solid #E24B4A44" }}>Georgia</span>
                      <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>vs.</span>
                      <span style={{ fontSize: 9, color: "#E24B4A", background: "#E24B4A14", padding: "1px 7px", borderRadius: 3, border: "0.5px solid #E24B4A44" }}>Russia</span>
                    </div>
                    <p style={{ fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1.55, margin: "0 0 6px" }}>
                      South Ossetia and Abkhazia have declared referendums on annexation to Russia following the pro-EU opposition victory in Georgian elections. Russian military forces have repositioned near the Georgian border. The situation is highly volatile.
                    </p>
                    <div style={{ fontSize: 8, color: "#E24B4A", fontWeight: 600 }}>
                      ⚠ Global tension elevated · South Caucasus destabilized
                    </div>
                  </div>
                </div>
              </>
            )}

            {!georgianCrisis && (
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 14, fontStyle: "italic" }}>
                No active crises at this time.
              </div>
            )}

            {/* Ongoing Wars */}
            <div style={{ ...sectionLabelStyle, marginBottom: 5 }}>Ongoing Wars</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ONGOING_WARS.map(war => (
                <div key={war.id} style={panelStyle}>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>{war.name}</span>
                      <span style={{
                        fontSize: 7, fontWeight: 700, letterSpacing: "0.1em",
                        color: "#C98B2E", background: "#C98B2E14",
                        padding: "1px 6px", borderRadius: 3, border: "0.5px solid #C98B2E44",
                        textTransform: "uppercase",
                      }}>{war.status}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                      {war.sides.map((side, i) => (
                        <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <span style={{
                            fontSize: 9, color: side.color,
                            background: `${side.color}14`,
                            padding: "1px 7px", borderRadius: 3,
                            border: `0.5px solid ${side.color}44`,
                          }}>{side.label}</span>
                          {i < war.sides.length - 1 && (
                            <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>vs.</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <p style={{ fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1.55, margin: "0 0 5px" }}>
                      {war.desc}
                    </p>
                    <div style={{ borderTop: "0.5px solid var(--color-border-secondary)", paddingTop: 5, marginTop: 2 }}>
                      <div style={{ fontSize: 8, color: "var(--color-text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>U.S. Posture</div>
                      <div style={{ fontSize: 9, color: "var(--color-text-primary)", lineHeight: 1.5 }}>{war.usPosture}</div>
                    </div>
                    <div style={{ fontSize: 8, color: "var(--color-text-secondary)", marginTop: 5 }}>
                      Since {war.started}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </>;
}
