export default function PDBModal({ curEv, wiy, yr, onChoice }) {
  if (!curEv || curEv.type !== "pdb") return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1020, padding: "16px",
    }}>
      <div style={{
        background: "#0c1422", maxWidth: 520, width: "100%", maxHeight: "92vh",
        overflowY: "auto", color: "#c8d8e8",
        boxShadow: "0 0 0 1px #1e3a5c, 0 32px 80px rgba(0,0,0,0.85), 0 0 80px rgba(15,60,120,0.12)",
        fontFamily: "'Courier New', Courier, monospace",
        animation: "billFadeIn 0.3s cubic-bezier(0.22,1,0.36,1) both",
      }}>

        {/* Top classification bar */}
        <div style={{
          background: "#8b0000", padding: "5px 18px", textAlign: "center",
          fontSize: 8, fontWeight: 800, letterSpacing: "0.22em", color: "#fff",
          textTransform: "uppercase",
        }}>
          ★ TOP SECRET // NOFORN // CLASSIFIED ★
        </div>

        {/* Agency header */}
        <div style={{
          padding: "14px 20px 12px", borderBottom: "1px solid #1a3550",
          display: "flex", alignItems: "center", gap: 14, background: "#091019",
        }}>
          {/* Seal */}
          <div style={{
            width: 56, height: 56, flexShrink: 0,
            border: "2px solid #b8922a",
            borderRadius: "50%",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(184,146,42,0.07)",
            position: "relative",
          }}>
            <div style={{ fontSize: 20, lineHeight: 1 }}>🦅</div>
            <div style={{ fontSize: 5, color: "#b8922a", letterSpacing: "0.12em", marginTop: 2 }}>C · I · A</div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 7, color: "#b8922a", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 4 }}>
              Central Intelligence Agency
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f4f8", letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.2 }}>
              President&apos;s Daily Brief
            </div>
            <div style={{ fontSize: 8, color: "#4a7a9b", marginTop: 4, letterSpacing: "0.1em" }}>
              WK {wiy}, YR {yr} &nbsp;·&nbsp; POTUS EYES ONLY &nbsp;·&nbsp; ORCON/NOFORN
            </div>
          </div>

          <div style={{
            fontSize: 7, color: "#4a7a9b", textAlign: "right", lineHeight: 1.8,
          }}>
            <div>REF: CIA-DDI-{yr}{String(wiy).padStart(2, "0")}</div>
            <div>HANDLE VIA</div>
            <div>GAMMA ONLY</div>
          </div>
        </div>

        {/* Document metadata strip */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "5px 20px", background: "#070d17", borderBottom: "1px solid #1a3550",
        }}>
          <div style={{ fontSize: 7, color: "#3a6a8a", letterSpacing: "0.1em" }}>
            DISSEMINATION: RESTRICTED — DO NOT REPRODUCE
          </div>
          <div style={{ fontSize: 7, color: "#3a6a8a", letterSpacing: "0.1em" }}>
            DESTROY AFTER READING
          </div>
        </div>

        {/* Assessment label */}
        <div style={{ padding: "14px 20px 0" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
          }}>
            <div style={{ flex: 1, height: "0.5px", background: "#1a3550" }} />
            <span style={{
              fontSize: 7, color: "#b8922a", letterSpacing: "0.22em",
              textTransform: "uppercase", whiteSpace: "nowrap",
            }}>KEY INTELLIGENCE ASSESSMENT</span>
            <div style={{ flex: 1, height: "0.5px", background: "#1a3550" }} />
          </div>

          <h2 style={{
            fontSize: 13, fontWeight: 700, color: "#f0f4f8",
            lineHeight: 1.4, margin: "0 0 12px", letterSpacing: "0.03em",
            fontFamily: "'Courier New', Courier, monospace",
          }}>{curEv.name}</h2>
        </div>

        {/* Body */}
        <div style={{ padding: "0 20px 16px", borderBottom: "1px solid #1a3550" }}>
          <div style={{
            background: "#07101c", border: "1px solid #162a40",
            padding: "12px 14px", borderLeft: "3px solid #1e3d66",
          }}>
            <p style={{
              fontSize: 11, color: "#a0b8cc", lineHeight: 1.8, margin: 0,
              fontFamily: "'Courier New', Courier, monospace",
            }}>{curEv.desc}</p>
          </div>
        </div>

        {/* Response options */}
        <div style={{ padding: "14px 20px 18px", background: "#070d17" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
          }}>
            <div style={{ flex: 1, height: "0.5px", background: "#1a3550" }} />
            <span style={{
              fontSize: 7, color: "#b8922a", letterSpacing: "0.22em",
              textTransform: "uppercase", whiteSpace: "nowrap",
            }}>AUTHORIZED RESPONSE OPTIONS</span>
            <div style={{ flex: 1, height: "0.5px", background: "#1a3550" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {curEv.choices.map((c, i) => (
              <button
                key={i}
                onClick={() => onChoice(c)}
                style={{
                  textAlign: "left", padding: "10px 14px",
                  background: "transparent",
                  border: "1px solid #1e3550",
                  borderLeft: "3px solid #b8922a",
                  cursor: "pointer",
                  color: "#a0b8cc",
                  fontFamily: "'Courier New', Courier, monospace",
                  transition: "background 0.13s, border-left-color 0.13s, color 0.13s",
                  width: "100%",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(184,146,42,0.07)";
                  e.currentTarget.style.borderLeftColor = "#e0b83a";
                  e.currentTarget.style.color = "#f0f4f8";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderLeftColor = "#b8922a";
                  e.currentTarget.style.color = "#a0b8cc";
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 9, color: "#b8922a", marginTop: 1, flexShrink: 0 }}>▶</span>
                  <div style={{ fontSize: 11, lineHeight: 1.55 }}>{c.text}</div>
                </div>
                {c.schedulesChain && (
                  <div style={{
                    fontSize: 8, color: "#3a6a8a", marginTop: 5, paddingLeft: 17,
                    letterSpacing: "0.06em",
                  }}>
                    ⏱ SIGINT FOLLOW-UP EXPECTED: +{c.schedulesChain.minDelay}–{c.schedulesChain.maxDelay} WKS
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom classification bar */}
        <div style={{
          background: "#8b0000", padding: "4px 18px", textAlign: "center",
          fontSize: 7, fontWeight: 700, letterSpacing: "0.18em", color: "#fff",
          textTransform: "uppercase",
        }}>
          TOP SECRET // NOFORN — CLASSIFICATION: TS/SCI
        </div>
      </div>
    </div>
  );
}
