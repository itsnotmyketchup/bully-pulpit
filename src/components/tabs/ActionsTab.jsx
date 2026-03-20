import { useMemo } from "react";
import {
  EXECUTIVE_ORDERS,
  DRILLING_REGION_OPTIONS,
  DEFAULT_REFUGEE_CAP,
  MIN_REFUGEE_CAP,
  MAX_REFUGEE_CAP,
  buildExecutiveOrderOutcome,
  getVisibleExecutiveOrders,
} from "../../data/executiveOrders.js";
import { VISIT_TYPES } from "../../data/visits.js";
import { SPEECH_TOPICS } from "../../data/speeches.js";
import { STATE_DATA } from "../../data/states.js";
import { OPPOSITION_FACTIONS } from "../../data/constants.js";
import { buildEffectPreview } from "../../utils/effectDisplay.js";
import VisitMap from "../VisitMap.jsx";

const controvColor = c => c === 0 ? "#2563eb" : c === 1 ? "#EF9F27" : c === 2 ? "#E27D27" : "#E24B4A";

export default function ActionsTab({
  act,
  maxActions,
  week,
  actionsSubTab, setActionsSubTab,
  selectedEO, setSelectedEO,
  eoChoice, setEoChoice,
  eoIssuedCount, activeOrders,
  executiveOverreach,
  pp, cg,
  countries, recentDisasters,
  visitState, setVisitState,
  visitType, setVisitType,
  visitTypeCounts,
  speechTopic, setSpeechTopic,
  speechPreview, setSpeechPreview,
  sA,
  onIssueEO, onRescindEO, onDoVisit, onDoSpeech,
}) {
  const oppIds = OPPOSITION_FACTIONS[pp] || [];
  const visibleExecutiveOrders = useMemo(() => getVisibleExecutiveOrders(week), [week]);

  const eo = selectedEO ? visibleExecutiveOrders.find(e => e.id === selectedEO) : null;
  const eoExtraData = eo ? {
    targetCountryId: eoChoice.countryId,
    factionOverride: eo?.choiceType === "declassify" && eoChoice.declassifyId
      ? eo.choices.find(c => c.id === eoChoice.declassifyId)?.factionOverride
      : undefined,
    declassifyId: eoChoice.declassifyId,
    refugeeCap: eoChoice.refugeeCap ?? DEFAULT_REFUGEE_CAP,
    drillingRegions: eoChoice.drillingRegions || [],
  } : null;
  const eoOutcome = eo ? buildExecutiveOrderOutcome(eo, eoExtraData) : null;
  const previewReactions = eoOutcome?.factionReactions || null;
  const lastIssuedOrder = eo
    ? activeOrders
        .filter(order => order.id === eo.id)
        .sort((a, b) => b.issuedWeek - a.issuedWeek)[0]
    : null;
  const repeatableCooldownRemaining = eo?.repeatable && lastIssuedOrder
    ? Math.max(0, lastIssuedOrder.issuedWeek + 52 - week)
    : 0;
  const canIssue = eo && act + 2 <= maxActions && (eo.repeatable || !(eoIssuedCount[eo.id] > 0))
    && repeatableCooldownRemaining === 0
    && (eo.choiceType !== "country" || eoChoice.countryId)
    && (eo.choiceType !== "declassify" || eoChoice.declassifyId)
    && (eo.choiceType !== "drilling_regions" || (eoChoice.drillingRegions || []).length > 0);

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
  const overreachIncrease = eo ? (eo.controversy === 0 ? 0 : 3 + 5 * eo.controversy) : 0;

  return <>
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
        {visibleExecutiveOrders.map(e => {
          const isSelected = selectedEO === e.id;
          const issued = eoIssuedCount[e.id] || 0;
          const exhausted = !e.repeatable && issued > 0;
          const previewItems = buildEffectPreview(e);
          const cooldownRemaining = e.repeatable
            ? Math.max(
                0,
                ((activeOrders.filter(order => order.id === e.id).sort((a, b) => b.issuedWeek - a.issuedWeek)[0]?.issuedWeek ?? -52) + 52) - week
              )
            : 0;
          return (
            <button key={e.id} onClick={() => setSelectedEO(isSelected ? null : e.id)} disabled={exhausted || cooldownRemaining > 0} style={{
              textAlign: "left", padding: "9px 11px", borderRadius: "var(--border-radius-lg)",
              border: isSelected ? "1px solid var(--color-border-secondary)" : "0.5px solid var(--color-border-tertiary)",
              background: isSelected ? "var(--color-background-secondary)" : exhausted ? "var(--color-background-tertiary)" : "var(--color-background-primary)",
              cursor: exhausted || cooldownRemaining > 0 ? "not-allowed" : "pointer", opacity: exhausted || cooldownRemaining > 0 ? 0.6 : 1,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.3, marginBottom: 3 }}>{e.name}</div>
              <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginBottom: 4 }}>{e.category}</div>
              {previewItems.slice(0, 3).map(item => (
                <div key={item.id} style={{ fontSize: 9, color: item.isMacro ? (item.positive ? "#2563eb" : "#7c3aed") : item.positive ? "#1D9E75" : "#E24B4A" }}>
                  {item.label}: {item.valueText}
                </div>
              ))}
              <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                {e.repeatable && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 4, background: "#2563eb22", color: "#2563eb" }}>Repeatable{issued > 0 ? ` ×${issued}` : ""}</span>}
                {cooldownRemaining > 0 && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 4, background: "#EF9F2722", color: "#EF9F27" }}>Cooldown {cooldownRemaining}w</span>}
                {e.reversible && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 4, background: "#1D9E7522", color: "#1D9E75" }}>Reversible</span>}
                {exhausted && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 4, background: "#E24B4A22", color: "#E24B4A" }}>Issued</span>}
              </div>
            </button>
          );
        })}
      </div>

      {eo && (
        <div style={{ padding: "12px 14px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", marginBottom: 12, border: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{eo.name}</div>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginTop: 1 }}>{eo.category} · Controversy {eo.controversy === 0 ? "None" : ["Low", "Moderate", "High"][eo.controversy - 1]}</div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", background: "var(--color-background-tertiary)", padding: "2px 8px", borderRadius: 6 }}>2 actions</div>
              <div style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: overreachIncrease > 0 ? "#E24B4A22" : "#1D9E7522", color: overreachIncrease > 0 ? "#E24B4A" : "#1D9E75" }}>{overreachIncrease > 0 ? `+${overreachIncrease} overreach` : "No overreach"}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8, lineHeight: 1.5 }}>{eo.desc}</div>

          {(Object.keys(eoOutcome?.effects || {}).length > 0 || eoOutcome?.delayedEffects) && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 3 }}>Effects:</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {buildEffectPreview(eoOutcome).map(item => (
                  <span key={item.id} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: item.isMacro ? (item.positive ? "#2563eb22" : "#7c3aed22") : item.positive ? "#1D9E7522" : "#E24B4A22", color: item.isMacro ? (item.positive ? "#2563eb" : "#7c3aed") : item.positive ? "#1D9E75" : "#E24B4A", border: item.delayed ? "1px dashed currentColor" : "none" }}>
                    {item.label}: {item.valueText}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 3 }}>Faction reactions:</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Object.entries(previewReactions || {}).map(([fid, v]) => {
                const f = cg?.factions[fid]; if (!f) return null;
                const rel = Math.round(v * 8); const isOpp = oppIds.includes(fid);
                return <span key={fid} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: rel > 0 ? "#1D9E7522" : rel < 0 ? "#E24B4A22" : "var(--color-background-tertiary)", color: rel > 0 ? "#1D9E75" : rel < 0 ? "#E24B4A" : "var(--color-text-secondary)" }}>{f.name.split(" ")[0]}: {rel > 0 ? "+" : ""}{rel} rel{isOpp ? " (opp)" : ""}</span>;
              })}
              {oppIds.filter(fid => !previewReactions || previewReactions[fid] == null || previewReactions[fid] >= 0).map(fid => {
                const f = cg?.factions[fid]; if (!f || (previewReactions && previewReactions[fid] != null)) return null;
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

          {eo.choiceType === "refugee_cap" && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-primary)" }}>Annual refugee admissions cap</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  {(eoChoice.refugeeCap ?? DEFAULT_REFUGEE_CAP).toLocaleString()}
                </div>
              </div>
              <input
                type="range"
                min={MIN_REFUGEE_CAP}
                max={MAX_REFUGEE_CAP}
                step="2500"
                value={eoChoice.refugeeCap ?? DEFAULT_REFUGEE_CAP}
                onChange={e => setEoChoice(prev => ({ ...prev, refugeeCap: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: controvColor(eo.controversy), marginBottom: 4 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--color-text-secondary)" }}>
                <span>{MIN_REFUGEE_CAP.toLocaleString()}</span>
                <span>Default {DEFAULT_REFUGEE_CAP.toLocaleString()}</span>
                <span>{MAX_REFUGEE_CAP.toLocaleString()}</span>
              </div>
            </div>
          )}

          {eo.choiceType === "drilling_regions" && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>Open drilling in:</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 4 }}>
                {DRILLING_REGION_OPTIONS.map(option => {
                  const checked = (eoChoice.drillingRegions || []).includes(option.id);
                  return (
                    <label key={option.id} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: "var(--border-radius-md)",
                      border: checked ? "1px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
                      background: checked ? "var(--color-background-primary)" : "transparent",
                      fontSize: 10, color: "var(--color-text-primary)", cursor: "pointer",
                    }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setEoChoice(prev => {
                          const current = prev.drillingRegions || [];
                          return {
                            ...prev,
                            drillingRegions: checked
                              ? current.filter(id => id !== option.id)
                              : [...current, option.id],
                          };
                        })}
                        style={{ accentColor: controvColor(eo.controversy) }}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
              <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginTop: 4 }}>
                Each selected region adds a 6% gas-price decrease after 52 weeks.
              </div>
            </div>
          )}

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

          <button onClick={() => onIssueEO(eo, eoExtraData)} disabled={!canIssue} style={{
            padding: "6px 16px", fontSize: 11, fontWeight: 500, border: "none", borderRadius: "var(--border-radius-md)",
            background: !canIssue ? "var(--color-background-tertiary)" : controvColor(eo.controversy),
            color: !canIssue ? "var(--color-text-secondary)" : "#fff",
            cursor: !canIssue ? "not-allowed" : "pointer",
          }}>
            {act + 2 > maxActions
              ? "Not enough actions"
              : repeatableCooldownRemaining > 0
                ? `Available in ${repeatableCooldownRemaining} weeks`
              : !eo.repeatable && eoIssuedCount[eo.id] > 0
                ? "Already issued"
                : eo.choiceType === "drilling_regions" && (eoChoice.drillingRegions || []).length === 0
                  ? "Select at least one region"
                  : "Sign Executive Order (2 actions)"}
          </button>
        </div>
      )}

      {activeOrders.filter(o => o.active).length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>Active Orders</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {activeOrders.filter(o => o.active).map((o, i) => {
              const eoData = EXECUTIVE_ORDERS.find(e => e.id === o.id);
              const rescindCooldownRemaining = Math.max(0, o.issuedWeek + 12 - week);
              const detail = o.choiceData?.declassifyId
                ? eoData?.choices?.find(c => c.id === o.choiceData.declassifyId)?.label
                : o.id === "refugee_cap" && o.choiceData?.refugeeCap
                  ? `Cap ${Number(o.choiceData.refugeeCap).toLocaleString()}`
                  : o.id === "drilling_permits" && o.choiceData?.drillingRegions?.length
                    ? DRILLING_REGION_OPTIONS
                        .filter(option => o.choiceData.drillingRegions.includes(option.id))
                        .map(option => option.label)
                        .join(", ")
                    : "";
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-primary)" }}>{o.name}</div>
                    <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>Signed Wk {o.issuedWeek}{detail ? ` · ${detail}` : ""}</div>
                  </div>
                  {eoData?.reversible && (
                    <button
                      onClick={() => onRescindEO(o.id)}
                      disabled={rescindCooldownRemaining > 0}
                      style={{
                        fontSize: 10,
                        padding: "3px 8px",
                        borderRadius: 4,
                        border: "0.5px solid #E24B4A",
                        background: "transparent",
                        color: rescindCooldownRemaining > 0 ? "var(--color-text-secondary)" : "#E24B4A",
                        cursor: rescindCooldownRemaining > 0 ? "not-allowed" : "pointer",
                        opacity: rescindCooldownRemaining > 0 ? 0.6 : 1,
                      }}
                    >
                      {rescindCooldownRemaining > 0 ? `${rescindCooldownRemaining}w` : "Rescind"}
                    </button>
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

      {/* Quick action */}
      <div style={{ marginBottom: 7 }}>
        <button onClick={() => {
          const s = STATE_DATA[Math.floor(Math.random() * STATE_DATA.length)];
          setVisitType("rally"); setVisitState(s.abbr);
        }} style={{
          padding: "4px 11px", fontSize: 10, fontWeight: 500,
          background: "transparent", color: "var(--color-text-secondary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)", cursor: "pointer",
        }}>⚡ Rally in a random state</button>
      </div>

      {/* Top: action bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        padding: "9px 12px", marginBottom: 10, borderRadius: "var(--border-radius-lg)",
        background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)",
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {visitType && visitState ? (() => {
            const vt = VISIT_TYPES.find(v => v.id === visitType);
            const usedCount = visitTypeCounts?.[visitType] || 0;
            const mult = 1 / (usedCount + 1);
            const pct = Math.round(mult * 100);
            return <>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  {vt?.name}
                  <span style={{ fontWeight: 400, color: "var(--color-text-secondary)" }}> · {STATE_DATA.find(s => s.abbr === visitState)?.name}</span>
                </div>
                {usedCount > 0 && (
                  <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 4, background: "#EF9F2722", color: "#EF9F27", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {pct}% effectiveness — used {usedCount}× this period
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>
                {vt?.approvalBoost && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: "#1D9E7522", color: "#1D9E75" }}>+{(vt.approvalBoost * mult).toFixed(2).replace(/\.?0+$/, "")} approval</span>}
                {vt?.partyUnityBoost && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: "#2563eb22", color: "#2563eb" }}>+{Math.round(vt.partyUnityBoost * mult)} unity</span>}
                {vt?.factionEffects && Object.entries(vt.factionEffects).map(([fid, fv]) => {
                  const f = cg?.factions[fid]; if (!f) return null;
                  const rel = Math.round(fv * 8 * mult);
                  return <span key={fid} style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: rel > 0 ? "#1D9E7522" : "#E24B4A22", color: rel > 0 ? "#1D9E75" : "#E24B4A" }}>{f.name.split(" ")[0]}: {rel > 0 ? "+" : ""}{rel} rel</span>;
                })}
                {vt?.educationEffect && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: "#2563eb22", color: "#2563eb" }}>Edu bonus</span>}
                {vt?.urbanEffect && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: "#7c3aed22", color: "#7c3aed" }}>Urban bonus</span>}
                {vt?.ruralEffect && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: "#D85A3022", color: "#D85A30" }}>Rural bonus</span>}
                {vt?.religiosityEffect && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: "#EF9F2722", color: "#EF9F27" }}>Religious bonus</span>}
              </div>
            </>;
          })() : (
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
              {!visitType
                ? "Step 1: pick a visit type below"
                : `Step 2: click a state on the map  ·  ${VISIT_TYPES.find(v => v.id === visitType)?.name} selected`}
            </div>
          )}
        </div>
        <button onClick={onDoVisit} disabled={!visitType || !visitState || act >= maxActions} style={{
          padding: "6px 16px", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0,
          background: visitType && visitState && act < maxActions ? "var(--color-text-primary)" : "var(--color-background-tertiary)",
          color: visitType && visitState && act < maxActions ? "var(--color-background-primary)" : "var(--color-text-secondary)",
          border: "none", borderRadius: "var(--border-radius-md)",
          cursor: visitType && visitState && act < maxActions ? "pointer" : "not-allowed",
        }}>Go visit</button>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>

        {/* Left: visit type grid */}
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Visit type</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {VISIT_TYPES.map(v => {
              const isSelected = visitType === v.id;
              const restriction = v.stateRestriction === "border" ? "Border states"
                : v.stateRestriction === "wallstreet" ? "NY only"
                : v.stateRestriction === "disaster" ? "Disaster zones"
                : v.stateRestriction === "tribal" ? "Tribal states"
                : null;
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
                  textAlign: "left", padding: "7px 9px", borderRadius: "var(--border-radius-lg)",
                  border: isSelected ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
                  background: isSelected ? "var(--color-background-secondary)" : "var(--color-background-primary)",
                  cursor: "pointer",
                }}>
                  <div style={{ fontSize: 10, fontWeight: isSelected ? 600 : 500, color: "var(--color-text-primary)", lineHeight: 1.3 }}>{v.name}</div>
                  {restriction && <div style={{ fontSize: 8, color: "#EF9F27", marginTop: 2 }}>{restriction}</div>}
                  {(() => {
                    const uc = visitTypeCounts?.[v.id] || 0;
                    if (uc === 0) return null;
                    const nextPct = Math.round(100 / (uc + 1));
                    return <div style={{ fontSize: 8, color: "#EF9F27", marginTop: 2 }}>{nextPct}% eff next use</div>;
                  })()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: map */}
        <div style={{ flex: "2 1 280px", minWidth: 0 }}>
          <VisitMap selectedState={visitState} setSelectedState={setVisitState} stateApprovals={sA} disabledStates={disabledStates} />
        </div>

      </div>
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
                <button onClick={() => onDoSpeech(pos)} disabled={act >= maxActions} style={{
                  padding: "5px 14px", fontSize: 11, fontWeight: 500,
                  background: act >= maxActions ? "var(--color-background-tertiary)" : "var(--color-text-primary)",
                  color: act >= maxActions ? "var(--color-text-secondary)" : "var(--color-background-primary)",
                  border: "none", borderRadius: "var(--border-radius-md)", cursor: act >= maxActions ? "not-allowed" : "pointer",
                }}>Deliver this speech (1 action)</button>
              </div>
            );
          })()}
        </>;
      })()}
    </>}
  </>;
}
