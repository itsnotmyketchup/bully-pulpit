import { useMemo } from "react";
import { EXECUTIVE_ORDERS } from "../../data/executiveOrders.js";
import { VISIT_TYPES } from "../../data/visits.js";
import { SPEECH_TOPICS } from "../../data/speeches.js";
import { STATE_DATA } from "../../data/states.js";
import { OPPOSITION_FACTIONS } from "../../data/constants.js";
import VisitMap from "../VisitMap.jsx";

const STAT_LABELS = {
  nationalDebt: "Nat. debt", approvalRating: "Approval", gasPrice: "Gas price",
  immigrationRate: "Immigration", tradeBalance: "Trade balance", inflation: "Inflation",
};

const controvColor = c => c === 1 ? "#EF9F27" : c === 2 ? "#E27D27" : "#E24B4A";

export default function ActionsTab({
  act, week,
  actionsSubTab, setActionsSubTab,
  selectedEO, setSelectedEO,
  eoChoice, setEoChoice,
  eoIssuedCount, activeOrders,
  executiveOverreach,
  pp, cg,
  countries, visitedCountries, recentDisasters,
  visitState, setVisitState,
  visitType, setVisitType,
  speechTopic, setSpeechTopic,
  speechPreview, setSpeechPreview,
  sA,
  onIssueEO, onRescindEO, onDoVisit, onDoSpeech,
}) {
  const oppIds = OPPOSITION_FACTIONS[pp] || [];

  const eo = selectedEO ? EXECUTIVE_ORDERS.find(e => e.id === selectedEO) : null;
  const previewReactions = eo
    ? (eo.choiceType === "declassify" && eoChoice.declassifyId
      ? (eo.choices.find(c => c.id === eoChoice.declassifyId)?.factionOverride || eo.factionReactions)
      : eo.factionReactions)
    : null;
  const canIssue = eo && act + 2 <= 4 && (eo.repeatable || !(eoIssuedCount[eo.id] > 0))
    && (eo.choiceType !== "country" || eoChoice.countryId)
    && (eo.choiceType !== "declassify" || eoChoice.declassifyId);

  const disabledStates = useMemo(() => {
    if (!visitType) return new Set();
    const vt = VISIT_TYPES.find(v => v.id === visitType);
    if (!vt?.stateRestriction) return new Set();
    if (vt.stateRestriction === "border") return new Set(STATE_DATA.filter(s => !s.border).map(s => s.abbr));
    if (vt.stateRestriction === "wallstreet") return new Set(STATE_DATA.filter(s => s.abbr !== "NY").map(s => s.abbr));
    if (vt.stateRestriction === "disaster") {
      const valid = new Set(Object.keys(recentDisasters));
      return valid.size === 0 ? new Set(STATE_DATA.map(s => s.abbr)) : new Set(STATE_DATA.filter(s => !valid.has(s.abbr)).map(s => s.abbr));
    }
    if (vt.stateRestriction === "tribal") return new Set(STATE_DATA.filter(s => !s.tribal).map(s => s.abbr));
    return new Set();
  }, [visitType, recentDisasters]);

  return <>
    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 8 }}>{4 - act} action{4 - act !== 1 ? "s" : ""} left this week.</div>

    {/* Sub-tab bar */}
    <div style={{ display: "flex", gap: 2, marginBottom: 14, borderBottom: "1px solid var(--color-border-tertiary)", paddingBottom: 8 }}>
      {[["orders", "Executive Orders"], ["visits", "State Visits"], ["speeches", "Speeches"]].map(([st, label]) => (
        <button key={st} onClick={() => setActionsSubTab(st)} style={{
          padding: "5px 12px", fontSize: 11, fontWeight: actionsSubTab === st ? 600 : 400,
          background: actionsSubTab === st ? "var(--color-background-secondary)" : "transparent",
          color: actionsSubTab === st ? "var(--color-text-primary)" : "var(--color-text-secondary)",
          border: actionsSubTab === st ? "0.5px solid var(--color-border-secondary)" : "0.5px solid transparent",
          borderRadius: "var(--border-radius-md)", cursor: "pointer",
        }}>{label}</button>
      ))}
    </div>

    {/* ── Executive Orders ── */}
    {actionsSubTab === "orders" && <>
      {(() => {
        const or = Math.round(executiveOverreach ?? 20);
        const orLevel = or > 60 ? "High" : or > 30 ? "Medium" : "Low";
        const orColor = or > 60 ? "#E24B4A" : or > 30 ? "#EF9F27" : "#1D9E75";
        return (
          <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: "var(--border-radius-lg)", background: "var(--color-background-secondary)", border: `0.5px solid ${orColor}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)" }}>Executive Overreach</span>
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: `${orColor}22`, color: orColor, fontWeight: 600 }}>{orLevel}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: orColor }}>{or}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: "var(--color-background-tertiary)", overflow: "hidden", marginBottom: 5 }}>
              <div style={{ height: "100%", width: `${or}%`, background: orColor, borderRadius: 3, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 9, color: "var(--color-text-secondary)", lineHeight: 1.45 }}>
              How much Congress perceives you as governing through executive power rather than legislation.
              Increases when you sign EOs or walk away from negotiations; decreases when bills pass or you negotiate.{" "}
              {or > 60
                ? "HIGH: Faction relationships are actively deteriorating each period."
                : or > 30
                  ? "MEDIUM: Faction relationships decline slightly each period."
                  : "LOW: No passive faction penalties."}
            </div>
          </div>
        );
      })()}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: 6, marginBottom: 12 }}>
        {EXECUTIVE_ORDERS.map(e => {
          const isSelected = selectedEO === e.id;
          const issued = eoIssuedCount[e.id] || 0;
          const exhausted = !e.repeatable && issued > 0;
          const cc = controvColor(e.controversy);
          return (
            <button key={e.id} onClick={() => setSelectedEO(isSelected ? null : e.id)} disabled={exhausted} style={{
              textAlign: "left", padding: "9px 11px", borderRadius: "var(--border-radius-lg)",
              border: isSelected ? `2px solid ${cc}` : "0.5px solid var(--color-border-tertiary)",
              background: isSelected ? "var(--color-background-secondary)" : exhausted ? "var(--color-background-tertiary)" : "var(--color-background-primary)",
              cursor: exhausted ? "not-allowed" : "pointer", opacity: exhausted ? 0.6 : 1,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.3 }}>{e.name}</div>
                <div style={{ display: "flex", gap: 1, flexShrink: 0, marginLeft: 4 }}>
                  {[1, 2, 3].map(n => <div key={n} style={{ width: 6, height: 6, borderRadius: "50%", background: n <= e.controversy ? cc : "var(--color-border-tertiary)" }} />)}
                </div>
              </div>
              <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginBottom: 4 }}>{e.category}</div>
              {Object.entries(e.effects || {}).filter(([, v]) => v !== 0).map(([k, v]) => (
                <div key={k} style={{ fontSize: 9, color: v > 0 ? "#1D9E75" : "#E24B4A" }}>
                  {v > 0 ? "+" : ""}{typeof v === "number" && Math.abs(v) < 1 ? (v * 100).toFixed(0) + "%" : v} {STAT_LABELS[k] || k}
                </div>
              ))}
              {e.delayedEffects && Object.entries(e.delayedEffects.effects || {}).map(([k, v]) => (
                <div key={k} style={{ fontSize: 9, color: v > 0 ? "#1D9E75" : "#E24B4A" }}>
                  {v > 0 ? "+" : ""}{typeof v === "number" && Math.abs(v) < 1 ? (v * 100).toFixed(0) + "%" : v} {STAT_LABELS[k] || k} (delayed)
                </div>
              ))}
              <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                {e.repeatable && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 4, background: "#2563eb22", color: "#2563eb" }}>Repeatable{issued > 0 ? ` ×${issued}` : ""}</span>}
                {e.reversible && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 4, background: "#1D9E7522", color: "#1D9E75" }}>Reversible</span>}
                {exhausted && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 4, background: "#E24B4A22", color: "#E24B4A" }}>Issued</span>}
              </div>
            </button>
          );
        })}
      </div>

      {eo && (
        <div style={{ padding: "12px 14px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", marginBottom: 12, borderLeft: `3px solid ${controvColor(eo.controversy)}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{eo.name}</div>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginTop: 1 }}>{eo.category} · Controversy {["Low", "Moderate", "High"][eo.controversy - 1]}</div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", background: "var(--color-background-tertiary)", padding: "2px 8px", borderRadius: 6 }}>2 actions</div>
              <div style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#E24B4A22", color: "#E24B4A" }}>+{3 + 5 * eo.controversy} overreach</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8, lineHeight: 1.5 }}>{eo.desc}</div>

          {(Object.keys(eo.effects || {}).length > 0 || eo.delayedEffects) && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 3 }}>Effects:</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(eo.effects || {}).filter(([, v]) => v !== 0).map(([k, v]) => (
                  <span key={k} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: v > 0 ? "#1D9E7522" : "#E24B4A22", color: v > 0 ? "#1D9E75" : "#E24B4A" }}>
                    {v > 0 ? "+" : ""}{STAT_LABELS[k] || k}: {typeof v === "number" && Math.abs(v) < 1 ? (v > 0 ? "+" : "") + (v * 100).toFixed(0) + "%" : v}
                  </span>
                ))}
                {eo.delayedEffects && Object.entries(eo.delayedEffects.effects).map(([k, v]) => (
                  <span key={k} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: v > 0 ? "#1D9E7511" : "#E24B4A11", color: v > 0 ? "#1D9E75" : "#E24B4A", border: "1px dashed", borderColor: v > 0 ? "#1D9E75" : "#E24B4A" }}>
                    {v > 0 ? "+" : ""}{STAT_LABELS[k] || k}: {(v * 100).toFixed(0)}% (in {eo.delayedEffects.weeks} wks)
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 3 }}>Faction reactions:</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Object.entries(previewReactions).map(([fid, v]) => {
                const f = cg?.factions[fid]; if (!f) return null;
                const rel = Math.round(v * 8); const isOpp = oppIds.includes(fid);
                return <span key={fid} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: rel > 0 ? "#1D9E7522" : "#E24B4A22", color: rel > 0 ? "#1D9E75" : "#E24B4A" }}>{f.name.split(" ")[0]}: {rel > 0 ? "+" : ""}{rel} rel{isOpp ? " (opp)" : ""}</span>;
              })}
              {oppIds.filter(fid => previewReactions[fid] == null || previewReactions[fid] >= 0).map(fid => {
                const f = cg?.factions[fid]; if (!f || previewReactions[fid] != null) return null;
                const pen = -(eo.controversy * 6);
                return <span key={fid} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "#E24B4A22", color: "#E24B4A" }}>{f.name.split(" ")[0]}: {pen} rel (opp)</span>;
              })}
            </div>
            {eo.controversy >= 2 && <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginTop: 3 }}>Opposition always penalised for executive overreach.</div>}
          </div>

          {eo.choiceType === "country" && (() => {
            const eligible = countries.filter(c => c.status === "HOSTILE" || c.status === "UNFRIENDLY");
            return (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 3 }}>Target nation:</div>
                {eligible.length === 0
                  ? <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>No hostile or unfriendly nations available.</div>
                  : <select value={eoChoice.countryId || ""} onChange={e => setEoChoice(prev => ({ ...prev, countryId: e.target.value }))} style={{ fontSize: 11, padding: "3px 6px", borderRadius: 4 }}>
                    <option value="">Select a nation…</option>
                    {eligible.map(c => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
                  </select>
                }
              </div>
            );
          })()}

          {eo.choiceType === "declassify" && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>What to declassify:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {eo.choices.map(ch => (
                  <button key={ch.id} onClick={() => setEoChoice(prev => ({ ...prev, declassifyId: ch.id }))} style={{
                    textAlign: "left", padding: "7px 10px", borderRadius: "var(--border-radius-md)",
                    border: eoChoice.declassifyId === ch.id ? "1.5px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
                    background: eoChoice.declassifyId === ch.id ? "var(--color-background-primary)" : "transparent",
                    cursor: "pointer",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-primary)" }}>{ch.label}</div>
                    <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginTop: 1 }}>{ch.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => onIssueEO(eo, {
            targetCountryId: eoChoice.countryId,
            factionOverride: eo.choiceType === "declassify" && eoChoice.declassifyId
              ? eo.choices.find(c => c.id === eoChoice.declassifyId)?.factionOverride
              : undefined,
            declassifyId: eoChoice.declassifyId,
          })} disabled={!canIssue} style={{
            padding: "6px 16px", fontSize: 11, fontWeight: 500, border: "none", borderRadius: "var(--border-radius-md)",
            background: !canIssue ? "var(--color-background-tertiary)" : controvColor(eo.controversy),
            color: !canIssue ? "var(--color-text-secondary)" : "#fff",
            cursor: !canIssue ? "not-allowed" : "pointer",
          }}>
            {act + 2 > 4 ? "Not enough actions" : !eo.repeatable && eoIssuedCount[eo.id] > 0 ? "Already issued" : "Sign Executive Order (2 actions)"}
          </button>
        </div>
      )}

      {activeOrders.filter(o => o.active).length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>Active Orders</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {activeOrders.filter(o => o.active).map((o, i) => {
              const eoData = EXECUTIVE_ORDERS.find(e => e.id === o.id);
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-primary)" }}>{o.name}</div>
                    <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>Signed Wk {o.issuedWeek}{o.choiceData?.declassifyId ? ` · ${eoData?.choices?.find(c => c.id === o.choiceData.declassifyId)?.label}` : ""}</div>
                  </div>
                  {eoData?.reversible && (
                    <button onClick={() => onRescindEO(o.id)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, border: "0.5px solid #E24B4A", background: "transparent", color: "#E24B4A", cursor: "pointer" }}>Rescind</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>}

    {/* ── State Visits ── */}
    {actionsSubTab === "visits" && <>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>Presidential visit</div>
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 8 }}>Select an activity, then click a state on the map.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 5, marginBottom: 8 }}>
        {VISIT_TYPES.map(v => {
          const isSelected = visitType === v.id;
          return (
            <button key={v.id} onClick={() => {
              const newType = isSelected ? "" : v.id;
              setVisitType(newType);
              if (visitState && newType) {
                const nvt = VISIT_TYPES.find(vv => vv.id === newType);
                if (nvt?.stateRestriction) {
                  let invalid = false;
                  if (nvt.stateRestriction === "border") invalid = !STATE_DATA.find(s => s.abbr === visitState)?.border;
                  else if (nvt.stateRestriction === "wallstreet") invalid = visitState !== "NY";
                  else if (nvt.stateRestriction === "disaster") invalid = !recentDisasters[visitState];
                  else if (nvt.stateRestriction === "tribal") invalid = !STATE_DATA.find(s => s.abbr === visitState)?.tribal;
                  if (invalid) setVisitState("");
                }
              }
            }} style={{
              textAlign: "left", padding: "8px 10px", borderRadius: "var(--border-radius-lg)",
              border: isSelected ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
              background: isSelected ? "var(--color-background-secondary)" : "var(--color-background-primary)",
              cursor: "pointer",
            }}>
              <div style={{ fontSize: 11, fontWeight: isSelected ? 600 : 500, color: "var(--color-text-primary)", marginBottom: 2 }}>{v.name}</div>
              {v.approvalBoost && <div style={{ fontSize: 9, color: "#1D9E75" }}>+{v.approvalBoost} national approval</div>}
              {v.factionEffects && <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>Affects faction relations</div>}
              {v.educationEffect && <div style={{ fontSize: 9, color: "#2563eb" }}>Bonus in educated states</div>}
              {v.urbanEffect && <div style={{ fontSize: 9, color: "#7c3aed" }}>Bonus in urban states</div>}
              {v.ruralEffect && <div style={{ fontSize: 9, color: "#D85A30" }}>Bonus in rural states</div>}
              {v.religiosityEffect && <div style={{ fontSize: 9, color: "#EF9F27" }}>Bonus in religious states</div>}
              {v.partyUnityBoost && <div style={{ fontSize: 9, color: "#1D9E75" }}>+{v.partyUnityBoost} party unity</div>}
              {v.stateRestriction === "border" && <div style={{ fontSize: 9, color: "#EF9F27" }}>Border states only</div>}
              {v.stateRestriction === "wallstreet" && <div style={{ fontSize: 9, color: "#EF9F27" }}>New York only</div>}
              {v.stateRestriction === "disaster" && <div style={{ fontSize: 9, color: "#EF9F27" }}>Recent disaster states only</div>}
              {v.stateRestriction === "tribal" && <div style={{ fontSize: 9, color: "#EF9F27" }}>States with large tribal populations</div>}
            </button>
          );
        })}
      </div>
      <VisitMap selectedState={visitState} setSelectedState={setVisitState} stateApprovals={sA} disabledStates={disabledStates} />
      {visitType && visitState && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
            <b style={{ color: "var(--color-text-primary)" }}>{VISIT_TYPES.find(v => v.id === visitType)?.name}</b> in <b style={{ color: "var(--color-text-primary)" }}>{STATE_DATA.find(s => s.abbr === visitState)?.name}</b>
          </div>
          <button onClick={onDoVisit} disabled={act >= 4} style={{
            padding: "6px 16px", fontSize: 11, fontWeight: 500,
            background: act >= 4 ? "var(--color-background-tertiary)" : "var(--color-text-primary)",
            color: act >= 4 ? "var(--color-text-secondary)" : "var(--color-background-primary)",
            border: "none", borderRadius: "var(--border-radius-md)", cursor: act >= 4 ? "not-allowed" : "pointer",
          }}>Go visit</button>
        </div>
      )}
    </>}

    {/* ── Speeches ── */}
    {actionsSubTab === "speeches" && <>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>Speeches and positions</div>
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 8 }}>Choose a topic, then pick your stance. Preview effects before committing.</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
        {SPEECH_TOPICS.map(t => (
          <button key={t.id} onClick={() => { setSpeechTopic(t.id); setSpeechPreview(null); }} style={{
            padding: "5px 10px", fontSize: 11,
            fontWeight: speechTopic === t.id ? 500 : 400,
            background: speechTopic === t.id ? "var(--color-background-secondary)" : "transparent",
            color: speechTopic === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            border: speechTopic === t.id ? "0.5px solid var(--color-border-secondary)" : "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)", cursor: "pointer",
          }}>{t.name}</button>
        ))}
      </div>
      {speechTopic && (() => {
        const topic = SPEECH_TOPICS.find(t => t.id === speechTopic);
        if (!topic) return null;
        return <>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>Your position on {topic.name}:</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 5, marginBottom: 8 }}>
            {topic.positions.map((pos, i) => {
              const isPreview = speechPreview === i;
              return (
                <button key={i} onClick={() => setSpeechPreview(i)} style={{
                  padding: "8px 10px", borderRadius: "var(--border-radius-lg)",
                  border: isPreview ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
                  background: "var(--color-background-primary)", cursor: "pointer", textAlign: "left",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2 }}>{pos.label}</div>
                  <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{pos.intensity.replace("-", " ")}</div>
                </button>
              );
            })}
          </div>
          {speechPreview !== null && (() => {
            const pos = topic.positions[speechPreview];
            return (
              <div style={{ padding: "10px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>Preview: "{pos.label}"</div>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                  Approval impact: <span style={{ fontWeight: 500, color: pos.approvalSwing > 0 ? "#1D9E75" : pos.approvalSwing < 0 ? "#E24B4A" : "var(--color-text-secondary)" }}>
                    {pos.approvalSwing > 0 ? "+" : ""}{pos.approvalSwing}
                  </span>
                </div>
                {pos.factionEffects && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 2 }}>Faction reactions:</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {Object.entries(pos.factionEffects).map(([fid, v]) => {
                        const f = cg?.factions[fid];
                        if (!f) return null;
                        return (
                          <span key={fid} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6, background: v > 0.2 ? "#1D9E7522" : v < -0.2 ? "#E24B4A22" : "var(--color-background-tertiary)", color: v > 0.2 ? "#1D9E75" : v < -0.2 ? "#E24B4A" : "var(--color-text-secondary)" }}>
                            {f.name.split(" ")[0]}: {v > 0 ? "+" : ""}{(v * 100).toFixed(0)}%
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                <button onClick={() => onDoSpeech(pos)} disabled={act >= 4} style={{
                  padding: "5px 14px", fontSize: 11, fontWeight: 500,
                  background: act >= 4 ? "var(--color-background-tertiary)" : "var(--color-text-primary)",
                  color: act >= 4 ? "var(--color-text-secondary)" : "var(--color-background-primary)",
                  border: "none", borderRadius: "var(--border-radius-md)", cursor: act >= 4 ? "not-allowed" : "pointer",
                }}>Deliver this speech (1 action)</button>
              </div>
            );
          })()}
        </>;
      })()}
    </>}
  </>;
}
