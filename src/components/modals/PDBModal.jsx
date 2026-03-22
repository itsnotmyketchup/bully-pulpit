export default function PDBModal({ curEv, wiy, yr, onChoice }) {
  if (!curEv || curEv.type !== "pdb") return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1020, padding: "16px",
    }}>
      <div style={{
        background: "var(--color-background-primary)",
        maxWidth: 540, width: "100%", maxHeight: "92vh",
        overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px var(--color-border-secondary)",
        animation: "billFadeIn 0.3s cubic-bezier(0.22,1,0.36,1) both",
      }}>

        {/* Top classification bar */}
        <div style={{
          background: "#a00000",
          padding: "5px 20px",
          textAlign: "center",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.18em",
          color: "#fff",
          fontFamily: "var(--font-sans)",
          textTransform: "uppercase",
        }}>
          TOP SECRET // NOFORN // CLASSIFIED
        </div>

        {/* Document header */}
        <div style={{
          padding: "16px 24px 14px",
          borderBottom: "2px solid var(--color-border-secondary)",
        }}>
          <div style={{
            fontSize: 8,
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--color-text-secondary)",
            marginBottom: 4,
          }}>
            Central Intelligence Agency
          </div>
          <div style={{
            fontSize: 17,
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            letterSpacing: "0.01em",
            marginBottom: 6,
          }}>
            President&apos;s Daily Brief
          </div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
          }}>
            <div style={{
              fontSize: 9,
              fontFamily: "var(--font-sans)",
              color: "var(--color-text-secondary)",
              letterSpacing: "0.06em",
            }}>
              Week {wiy}, Year {yr} &nbsp;·&nbsp; POTUS EYES ONLY
            </div>
            <div style={{
              fontSize: 9,
              fontFamily: "var(--font-sans)",
              color: "var(--color-text-secondary)",
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}>
              REF: CIA-DDI-{yr}{String(wiy).padStart(2, "0")}
            </div>
          </div>
        </div>

        {/* Assessment title */}
        <div style={{ padding: "16px 24px 0" }}>
          <div style={{
            fontSize: 8,
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--color-text-secondary)",
            marginBottom: 8,
          }}>
            Key Intelligence Assessment
          </div>
          <h2 style={{
            fontSize: 14,
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            lineHeight: 1.4,
            margin: "0 0 14px",
          }}>
            {curEv.name}
          </h2>
        </div>

        {/* Body */}
        <div style={{
          padding: "0 24px 16px",
          borderBottom: "1px solid var(--color-border-tertiary)",
        }}>
          <p style={{
            fontSize: 12,
            fontFamily: "var(--font-serif)",
            color: "var(--color-text-primary)",
            lineHeight: 1.8,
            margin: 0,
            whiteSpace: "pre-line",
          }}>
            {curEv.desc}
          </p>
        </div>

        {/* Response options */}
        <div style={{
          padding: "14px 24px 18px",
          background: "var(--color-background-secondary)",
        }}>
          <div style={{
            fontSize: 8,
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--color-text-secondary)",
            marginBottom: 10,
          }}>
            Presidential Response Options
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {curEv.choices.map((c, i) => (
              <button
                key={i}
                onClick={() => onChoice(c)}
                style={{
                  textAlign: "left",
                  padding: "10px 14px",
                  background: "var(--color-background-primary)",
                  border: "1px solid var(--color-border-secondary)",
                  borderLeft: "3px solid #2563eb",
                  cursor: "pointer",
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  lineHeight: 1.55,
                  transition: "background 0.12s, border-left-color 0.12s",
                  width: "100%",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "var(--color-background-tertiary)";
                  e.currentTarget.style.borderLeftColor = "#1d4ed8";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "var(--color-background-primary)";
                  e.currentTarget.style.borderLeftColor = "#2563eb";
                }}
              >
                {c.text}
                {c.schedulesChain && (
                  <div style={{
                    fontSize: 9,
                    color: "var(--color-text-secondary)",
                    marginTop: 4,
                    fontStyle: "italic",
                  }}>
                    Follow-up intelligence expected in {c.schedulesChain.minDelay}–{c.schedulesChain.maxDelay} weeks
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom classification bar */}
        <div style={{
          background: "#a00000",
          padding: "4px 20px",
          textAlign: "center",
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: "0.18em",
          color: "#fff",
          fontFamily: "var(--font-sans)",
          textTransform: "uppercase",
        }}>
          TOP SECRET // NOFORN — DESTROY AFTER READING
        </div>
      </div>
    </div>
  );
}
