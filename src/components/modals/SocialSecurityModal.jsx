import { computeSSProjection, computeSSReactions } from "../../logic/socialSecurity.js";

const cardStyle = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: "var(--border-radius-lg)",
  padding: "14px 15px",
};

const sectionLabelStyle = {
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "var(--color-text-secondary)",
  marginBottom: 6,
};

function valueTone(current, next) {
  if (next > current + 0.001) return "#E24B4A";
  if (next < current - 0.001) return "#1D9E75";
  return "var(--color-text-primary)";
}

function SSChoiceRow({ label, note, options, selected, onSelect, fmt }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{label}</span>
        {note && <span style={{ fontSize: 9, color: "var(--color-text-secondary)", fontStyle: "italic" }}>{note}</span>}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {options.map(({ value, label: optLabel }) => {
          const active = selected === value;
          return (
            <button
              key={value}
              onClick={() => onSelect(value)}
              style={{
                padding: "5px 10px",
                fontSize: 10,
                borderRadius: "999px",
                border: active ? "0.5px solid rgba(55,138,221,0.55)" : "0.5px solid var(--color-border-secondary)",
                background: active ? "rgba(55,138,221,0.14)" : "var(--color-background-primary)",
                color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                cursor: "pointer",
              }}
            >
              {optLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SSSlider({ label, note, value, min, max, step, fmt, onChange, currentDisplay, nextDisplay, isGoodUp }) {
  const improved = nextDisplay !== currentDisplay && ((isGoodUp && nextDisplay > currentDisplay) || (!isGoodUp && nextDisplay < currentDisplay));
  const worsened = nextDisplay !== currentDisplay && ((isGoodUp && nextDisplay < currentDisplay) || (!isGoodUp && nextDisplay > currentDisplay));
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{label}</span>
        <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
          {fmt(currentDisplay)}
          {value !== 0 && (
            <>
              <span style={{ margin: "0 4px" }}>→</span>
              <span style={{ color: improved ? "#1D9E75" : worsened ? "#E24B4A" : "var(--color-text-primary)", fontWeight: 600 }}>
                {fmt(nextDisplay)}
              </span>
              <span style={{ marginLeft: 6, color: "var(--color-text-secondary)" }}>
                ({value > 0 ? "+" : ""}{fmt(value)})
              </span>
            </>
          )}
        </span>
      </div>
      {note && <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginBottom: 4 }}>{note}</div>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#8FA7C1" }}
      />
    </div>
  );
}

function InsolvencyBar({ yearsToInsolvency }) {
  const maxYears = 20;
  const pct = yearsToInsolvency == null ? 100 : Math.min(100, (yearsToInsolvency / maxYears) * 100);
  const color = yearsToInsolvency == null ? "#1D9E75"
    : yearsToInsolvency > 15 ? "#1D9E75"
    : yearsToInsolvency > 8 ? "#EF9F27"
    : yearsToInsolvency > 3 ? "#E24B4A"
    : "#c0392b";
  return (
    <div style={{ marginTop: 8, marginBottom: 10 }}>
      <div style={{ height: 6, borderRadius: 3, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)" }}>
        <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: color, transition: "width 0.3s ease, background 0.3s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 8, color: "var(--color-text-secondary)" }}>Insolvent</span>
        <span style={{ fontSize: 8, color: "var(--color-text-secondary)" }}>20+ yrs solvent</span>
      </div>
    </div>
  );
}

export default function SocialSecurityModal({ ssDraft, stats, macroState, factions, onChangeDraft, onSubmit, onCancel, week }) {
  if (!ssDraft) return null;

  const projection = computeSSProjection(stats, macroState, ssDraft, week ?? 1);
  const baseProjection = computeSSProjection(stats, macroState, {}, week ?? 1);
  const reactions = computeSSReactions(ssDraft, projection.insolvencyYear, projection.currentGameYear);

  const { ssIncome, ssSpending, annualSurplus, trustFundBalance, insolvencyYear, avgMonthlyBenefit, numBeneficiaries, projectedPayrollTaxRate, currentGameYear } = projection;

  const yearsToInsolvency = insolvencyYear ? insolvencyYear - currentGameYear : null;
  const insolvencyColor = yearsToInsolvency == null ? "#1D9E75"
    : yearsToInsolvency > 15 ? "#1D9E75"
    : yearsToInsolvency > 8 ? "#EF9F27"
    : yearsToInsolvency > 3 ? "#E24B4A"
    : "#c0392b";

  const insolvencyText = insolvencyYear == null
    ? "Solvent (20+ years)"
    : `In ~${yearsToInsolvency} years`;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(7,10,16,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "calc(var(--border-radius-lg) + 2px)", padding: "22px 24px", maxWidth: 880, width: "100%", border: "0.5px solid var(--color-border-secondary)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 28px 80px rgba(0,0,0,0.35)" }}>

        {/* Header */}
        <div style={{ borderBottom: "0.5px solid var(--color-border-secondary)", paddingBottom: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.16em", color: "#8FA7C1", marginBottom: 5 }}>Social Security Briefing</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>Social Security Reform Act</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.55, maxWidth: 520 }}>
                Adjust payroll taxes, retirement age, benefit levels, COLA method, and benefit taxation to extend solvency.
                Simple majority required. Two-year cooldown after passage.
              </div>
            </div>
            <div style={{ minWidth: 220, ...cardStyle, padding: "12px 14px" }}>
              <div style={{ ...sectionLabelStyle, marginBottom: 4 }}>Trust Fund Outlook</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: insolvencyColor }}>
                {insolvencyText}
              </div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2 }}>
                Annual {annualSurplus >= 0 ? "surplus" : "deficit"}: {annualSurplus >= 0 ? "+" : ""}${Math.abs(Math.round(annualSurplus))}B
              </div>
              <InsolvencyBar yearsToInsolvency={yearsToInsolvency} />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(260px, 0.8fr)", gap: 14 }}>

          {/* Left: Controls */}
          <div style={{ display: "grid", gap: 14, minWidth: 0 }}>

            {/* Revenue */}
            <div style={cardStyle}>
              <div style={sectionLabelStyle}>Revenue</div>
              <SSSlider
                label="Payroll tax adjustment"
                note="Raises both employee and employer OASDI contributions proportionally."
                value={ssDraft.payrollTaxDelta ?? 0}
                min={0}
                max={4}
                step={0.5}
                fmt={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} pp`}
                currentDisplay={0}
                nextDisplay={ssDraft.payrollTaxDelta ?? 0}
                isGoodUp={true}
                onChange={(v) => onChangeDraft("payrollTaxDelta", v)}
              />
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                Projected payroll tax rate: <span style={{ color: valueTone(stats.payrollTaxRate, projectedPayrollTaxRate), fontWeight: 600 }}>
                  {stats.payrollTaxRate.toFixed(2)}% → {projectedPayrollTaxRate.toFixed(2)}%
                </span>
              </div>
              <SSChoiceRow
                label="Taxation of SS benefits"
                note="Currently, up to 85% of benefits are taxable above income thresholds."
                options={[
                  { value: 0, label: "Eliminate taxation" },
                  { value: 1, label: "Current law" },
                  { value: 2, label: "Expand taxation" },
                ]}
                selected={ssDraft.benefitTaxation ?? 1}
                onSelect={(v) => onChangeDraft("benefitTaxation", v)}
              />
              <SSChoiceRow
                label="Earnings test"
                note="The retirement earnings test reduces benefits for those who work before full retirement age."
                options={[
                  { value: 0, label: "Keep earnings test" },
                  { value: 1, label: "Remove earnings test" },
                ]}
                selected={ssDraft.earningsTest ?? 0}
                onSelect={(v) => onChangeDraft("earningsTest", v)}
              />
            </div>

            {/* Benefits */}
            <div style={cardStyle}>
              <div style={sectionLabelStyle}>Benefits</div>
              <SSChoiceRow
                label="Full retirement age (FRA)"
                note="Current FRA is 67 for those born after 1960. Raising it reduces lifetime benefits for new retirees."
                options={[
                  { value: 65, label: "Age 65" },
                  { value: 66, label: "Age 66" },
                  { value: 67, label: "Age 67 (current)" },
                  { value: 68, label: "Age 68" },
                  { value: 70, label: "Age 70" },
                ]}
                selected={ssDraft.retirementAge ?? 67}
                onSelect={(v) => onChangeDraft("retirementAge", v)}
              />
              <SSSlider
                label="Across-the-board benefit adjustment"
                note="Applies to all current and future beneficiaries immediately upon enactment."
                value={ssDraft.benefitAdjustment ?? 0}
                min={-20}
                max={30}
                step={5}
                fmt={(v) => `${v >= 0 ? "+" : ""}${v}%`}
                currentDisplay={baseProjection.avgMonthlyBenefit}
                nextDisplay={projection.avgMonthlyBenefit}
                isGoodUp={true}
                onChange={(v) => onChangeDraft("benefitAdjustment", v)}
              />
              <SSSlider
                label="Benefit formula (PIA) adjustment"
                note="Changes the Primary Insurance Amount formula. Affects new retirees; current beneficiaries grandfathered."
                value={ssDraft.benefitFormula ?? 0}
                min={-20}
                max={20}
                step={5}
                fmt={(v) => `${v >= 0 ? "+" : ""}${v}%`}
                currentDisplay={0}
                nextDisplay={ssDraft.benefitFormula ?? 0}
                isGoodUp={true}
                onChange={(v) => onChangeDraft("benefitFormula", v)}
              />
              <SSChoiceRow
                label="Cost-of-living adjustment (COLA) method"
                note="CPI-E tracks elderly spending patterns (more healthcare weight); Chained CPI grows slower and saves money."
                options={[
                  { value: -1, label: "Chained CPI (slower)" },
                  { value: 0, label: "CPI-W (current)" },
                  { value: 1, label: "CPI-E (elderly)" },
                ]}
                selected={ssDraft.colaMethod ?? 0}
                onSelect={(v) => onChangeDraft("colaMethod", v)}
              />
            </div>
          </div>

          {/* Right: Sticky Preview */}
          <div style={{ display: "grid", gap: 14, alignContent: "start", position: "sticky", top: 12, alignSelf: "start" }}>

            {/* Trust Fund Status */}
            <div style={cardStyle}>
              <div style={sectionLabelStyle}>Trust Fund Status</div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Balance</span>
                <span style={{ fontSize: 11, fontWeight: 600 }}>${Math.round(trustFundBalance).toLocaleString()}B</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Annual {annualSurplus >= 0 ? "surplus" : "deficit"}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: annualSurplus >= 0 ? "#1D9E75" : "#E24B4A" }}>
                  {annualSurplus >= 0 ? "+" : ""}${Math.abs(Math.round(annualSurplus))}B
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Insolvency</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: insolvencyColor }}>{insolvencyText}</span>
              </div>
              <InsolvencyBar yearsToInsolvency={yearsToInsolvency} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>SS income</span>
                <span style={{ fontSize: 11, fontWeight: 600 }}>${Math.round(ssIncome)}B/yr</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>SS outlays</span>
                <span style={{ fontSize: 11, fontWeight: 600 }}>${Math.round(ssSpending)}B/yr</span>
              </div>
            </div>

            {/* Benefits Preview */}
            <div style={cardStyle}>
              <div style={sectionLabelStyle}>Beneficiary Impact</div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Avg monthly benefit</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: valueTone(baseProjection.avgMonthlyBenefit, avgMonthlyBenefit) }}>
                  ${baseProjection.avgMonthlyBenefit.toLocaleString()} → ${avgMonthlyBenefit.toLocaleString()}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Beneficiaries</span>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{(numBeneficiaries / 1e6).toFixed(1)}M</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Projected payroll rate</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: valueTone(stats.payrollTaxRate, projectedPayrollTaxRate) }}>
                  {projectedPayrollTaxRate.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Faction Reactions */}
            <div style={cardStyle}>
              <div style={sectionLabelStyle}>Faction Reactions</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(reactions).map(([factionId, value]) => {
                  const faction = factions[factionId];
                  if (!faction) return null;
                  const positive = value > 0.06;
                  const negative = value < -0.06;
                  return (
                    <span
                      key={factionId}
                      style={{
                        fontSize: 10,
                        padding: "4px 8px",
                        borderRadius: "999px",
                        background: positive ? "#1D9E7522" : negative ? "#E24B4A22" : "var(--color-background-secondary)",
                        color: positive ? "#1D9E75" : negative ? "#E24B4A" : "var(--color-text-secondary)",
                      }}
                    >
                      {faction.name}: {value > 0 ? "+" : ""}{(value * 100).toFixed(0)}%
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Footer + Actions */}
            <div style={{ ...cardStyle, background: "linear-gradient(180deg, rgba(143,167,193,0.08), rgba(143,167,193,0.02))" }}>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
                Social Security reform passes by simple majority in both chambers (no filibuster threshold).
                A 2-year cooldown applies after passage or veto.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={onSubmit}
                  style={{ flex: 1, padding: "9px 12px", fontSize: 12, fontWeight: 600, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}
                >
                  Submit to Congress
                </button>
                <button
                  onClick={onCancel}
                  style={{ padding: "9px 16px", fontSize: 11, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
