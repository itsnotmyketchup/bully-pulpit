import { BILL_AMENDMENTS } from "../../data/policies.js";
import { SM } from "../../data/stats.js";

export default function SignBillModal({ pendingSignature, appliedAmendments, factions, pn, week, onSign, onVeto }) {
  if (!pendingSignature) return null;
  const { act, votes, isBudget } = pendingSignature;

  const yr = Math.ceil(week / 52);
  const billAmends = (appliedAmendments[act.id] || [])
    .map(id => (BILL_AMENDMENTS[act.id] || []).find(a => a.id === id))
    .filter(Boolean);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1015, padding: "16px" }}>
      <div style={{
        background: "#FAFAF6", borderRadius: 4, maxWidth: 420, width: "100%", maxHeight: "88vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px #c8b49a",
        animation: "billFadeIn 0.35s cubic-bezier(0.22,1,0.36,1) both", color: "#1a1208",
      }}>
        <div style={{ background: "#1a2744", padding: "14px 20px 12px", borderRadius: "4px 4px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.25)" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: "0.15em", textTransform: "uppercase", whiteSpace: "nowrap" }}>★ United States of America ★</span>
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.25)" }} />
          </div>
          <div style={{ textAlign: "center", fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            One Hundred Nineteenth Congress · {isBudget ? "Budget Reconciliation Act" : "Enrolled Bill"}
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7a6040", marginBottom: 6 }}>An Act</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1208", lineHeight: 1.25, marginBottom: 8, fontFamily: "Georgia, serif" }}>{act.name}</div>
            <div style={{ fontSize: 10, color: "#5a4830", lineHeight: 1.5 }}>{act.desc}</div>
          </div>

          {/* Vote tally */}
          <div style={{ borderTop: "1px solid #d4c4a8", borderBottom: "1px solid #d4c4a8", padding: "10px 0", marginBottom: 14 }}>
            <div style={{ fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7a6040", textAlign: "center", marginBottom: 8 }}>Passed by Congress</div>
            <div style={{ display: "flex", gap: 12 }}>
              {[
                { label: "Senate", yes: votes.senateYes, no: votes.senateNo },
                { label: "House",  yes: votes.houseYes,  no: votes.houseNo  },
              ].map(ch => {
                const total = ch.yes + ch.no;
                const pct   = total > 0 ? ch.yes / total : 0;
                return (
                  <div key={ch.label} style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 9, color: "#7a6040", fontWeight: 600 }}>{ch.label}</span>
                      <span style={{ fontSize: 9, color: "#3a2810" }}>{ch.yes} Yea · {ch.no} Nay</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 2, background: "#e8dcc8", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct * 100}%`, background: "#2d6a3f", borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Effects if signed */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7a6040", marginBottom: 7 }}>If Signed — Effects</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
              <div style={{ background: "#d4eedd", borderRadius: 3, padding: "4px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 7, color: "#2d6a3f", textTransform: "uppercase", letterSpacing: "0.08em" }}>Approval</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#2d6a3f" }}>+1.5</div>
              </div>
              {Object.entries(act.effects || {}).filter(([, v]) => v !== 0).map(([k, v]) => {
                const meta = SM[k];
                if (!meta) return null;
                const good = (meta.g === "up" && v > 0) || (meta.g === "down" && v < 0);
                return (
                  <div key={k} style={{ background: good ? "#d4eedd" : "#f8d7d7", borderRadius: 3, padding: "4px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 7, color: good ? "#2d6a3f" : "#8b1a1a", textTransform: "uppercase", letterSpacing: "0.08em" }}>{meta.l}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: good ? "#2d6a3f" : "#8b1a1a" }}>{v > 0 ? "+" : ""}{v}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 7, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a8060", marginBottom: 5 }}>Faction Reactions</div>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              {Object.entries(act.factionReactions || {}).map(([fid, v]) => {
                const f = factions[fid];
                if (!f) return null;
                return (
                  <span key={fid} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: v > 0.2 ? "#d4eedd" : v < -0.2 ? "#f8d7d7" : "#ede8e0", color: v > 0.2 ? "#2d6a3f" : v < -0.2 ? "#8b1a1a" : "#7a6040" }}>
                    {f.name.split(" ")[0]}: {v > 0 ? "+" : ""}{Math.round(v * 100)}%
                  </span>
                );
              })}
            </div>
          </div>

          {/* Amendments */}
          {billAmends.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7a6040", marginBottom: 5 }}>Amendments Adopted</div>
              {billAmends.map(a => (
                <div key={a.id} style={{ fontSize: 9, color: "#4a3820", marginBottom: 2 }}>§ {a.label}</div>
              ))}
            </div>
          )}

          {/* Signature */}
          <div style={{ borderTop: "1px solid #d4c4a8", paddingTop: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7a6040", marginBottom: 12 }}>Presidential Action Required</div>
            <div style={{ fontSize: 8, color: "#7a6040", marginBottom: 4 }}>President of the United States</div>
            <div style={{ fontSize: 28, fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", color: "#1a2744", letterSpacing: "0.04em", lineHeight: 1, marginBottom: 2, animation: "signatureDraw 1.4s ease-out 0.2s both", display: "inline-block" }}>
              {pn || "President"}
            </div>
            <div style={{ height: 1, background: "#c8b49a", marginTop: 4, marginBottom: 4 }} />
            <div style={{ fontSize: 8, color: "#9a8060" }}>Week {week}, Year {yr}</div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onSign} style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, background: "#1a4a2a", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", letterSpacing: "0.03em" }}>✦ Sign into Law</button>
            <button onClick={onVeto} style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, background: "#fff", color: "#8B1A1A", border: "1.5px solid #8B1A1A", borderRadius: 3, cursor: "pointer", letterSpacing: "0.03em" }}>✗ Issue Veto</button>
          </div>
          <div style={{ marginTop: 8, fontSize: 9, color: "#9a8060", textAlign: "center" }}>
            Vetoing will damage relations with supporting factions and may allow re-introduction in 8 weeks.
          </div>
        </div>
      </div>
    </div>
  );
}
