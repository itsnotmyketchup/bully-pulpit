import { PARTIES, FACTION_DATA } from "../../data/factions.js";

const DIFFICULTY_OPTIONS = [
  {
    id: "easy",
    label: "Easy",
    summary: "Your party starts with supermajorities in both chambers.",
    detail: "Expect roughly 60-65 seats in the Senate and a commanding House majority.",
  },
  {
    id: "normal",
    label: "Normal",
    summary: "Your party starts with slight majorities in the House and Senate.",
    detail: "This is the current baseline setup and the default experience.",
  },
  {
    id: "hard",
    label: "Hard",
    summary: "The opposition starts with slight majorities in both chambers.",
    detail: "You can still govern, but legislation will require tighter coalition management.",
  },
  {
    id: "very_hard",
    label: "Very Hard",
    summary: "The opposition starts with supermajorities in the House and Senate.",
    detail: "You will be governing deep in the minority and leaning hard on persuasion and timing.",
  },
];

export default function SetupScreen({ pp, setPP, pf, setPF, pn, setPN, vpn, setVpn, difficulty, setDifficulty, onStart }) {
  const canStart = pp && pf && pn.trim() && vpn.trim();
  return (
    <div style={{ minHeight: 440, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ maxWidth: 440, width: "100%" }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: 8 }}>Inauguration day</div>
        <h2 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 14px" }}>Who are you, Mr./Madam President?</h2>

        <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 3 }}>Name</label>
        <input type="text" value={pn} onChange={e => setPN(e.target.value)} placeholder="Enter your name"
          style={{ width: "100%", marginBottom: 12, boxSizing: "border-box" }} />

        <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 3 }}>Vice President</label>
        <input type="text" value={vpn} onChange={e => setVpn(e.target.value)} placeholder="Enter the vice president's name"
          style={{ width: "100%", marginBottom: 12, boxSizing: "border-box" }} />

        <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Party</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["DEM", "REP"].map(p => (
            <button key={p} onClick={() => { setPP(p); setPF(null); }} style={{
              flex: 1, padding: "10px", borderRadius: "var(--border-radius-lg)", textAlign: "left",
              border: pp === p ? `2px solid ${p === "DEM" ? "#378ADD" : "#E24B4A"}` : "0.5px solid var(--color-border-tertiary)",
              background: pp === p ? (p === "DEM" ? "#378ADD11" : "#E24B4A11") : "var(--color-background-primary)",
              cursor: "pointer",
            }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: p === "DEM" ? "#378ADD" : "#E24B4A" }}>{PARTIES[p]}</div>
            </button>
          ))}
        </div>

        {pp && <>
          <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Faction</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {FACTION_DATA[pp].map(f => (
              <button key={f.id} onClick={() => setPF(f.id)} style={{
                textAlign: "left", padding: "10px 12px", borderRadius: "var(--border-radius-lg)",
                border: pf === f.id ? `2px solid ${f.color}` : "0.5px solid var(--color-border-tertiary)",
                background: pf === f.id ? f.color + "11" : "var(--color-background-primary)",
                cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: f.color }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{f.name}</span>
                </div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                  {f.goals.map((g, i) => (
                    <span key={i} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)" }}>{g}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </>}

        <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Difficulty</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {DIFFICULTY_OPTIONS.map(option => (
            <button
              key={option.id}
              onClick={() => setDifficulty(option.id)}
              style={{
                textAlign: "left",
                padding: "11px 12px",
                borderRadius: "var(--border-radius-lg)",
                border: difficulty === option.id ? "2px solid var(--color-text-primary)" : "0.5px solid var(--color-border-tertiary)",
                background: difficulty === option.id ? "var(--color-background-secondary)" : "var(--color-background-primary)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{option.label}</span>
                {option.id === "normal" && (
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "var(--color-background-tertiary)", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Default
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-primary)", marginBottom: 3 }}>{option.summary}</div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1.4 }}>{option.detail}</div>
            </button>
          ))}
        </div>

        <button onClick={onStart} disabled={!canStart} style={{
          width: "100%", padding: "10px", fontSize: 14, fontWeight: 500,
          background: canStart ? "var(--color-text-primary)" : "var(--color-background-tertiary)",
          color: canStart ? "var(--color-background-primary)" : "var(--color-text-secondary)",
          border: "none", borderRadius: "var(--border-radius-md)",
          cursor: canStart ? "pointer" : "not-allowed",
        }}>Take the oath of office</button>
      </div>
    </div>
  );
}
