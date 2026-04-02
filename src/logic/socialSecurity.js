/**
 * Social Security (OASDI) simulation logic.
 * CBO 2024 baselines:
 *   - OASDI trust fund: $2,790B
 *   - Annual SS spending: ~$1,490B
 *   - SS payroll revenue (employer + employee OASDI): ~$1,318B
 *   - Benefit taxation income: ~$51B
 *   - Annual deficit at game start: ~$121B growing ~$20B/yr (demographics)
 *   - Depletion horizon: ~10–11 years (matches CBO 2033–2035)
 *   - Average monthly benefit: ~$1,907 (CBO 2024)
 *   - Beneficiaries: ~72M (20.9% of 345M population)
 */

const RETIREMENT_AGE_FACTORS = { 65: 1.12, 66: 1.05, 67: 1.0, 68: 0.94, 70: 0.84 };
// COLA method: chained CPI saves ~0.2%/yr vs CPI-W; CPI-E costs ~0.3%/yr more
const COLA_FACTORS = { "-1": 0.998, "0": 1.0, "1": 1.003 };

/**
 * Computes total SS income: OASDI payroll revenue (employer+employee) + benefit taxation.
 * Uses game's payrollTaxRate (employee side, 7.65%) scaled to full OASDI (12.4%) via 12.4/7.65 multiplier.
 */
export function computeSSIncome(stats, macroState) {
  const nominalGdpB = (macroState.realGdp ?? 28) * ((macroState.priceLevel ?? 100) / 100) * 1000;
  const unemploymentRate = stats.unemployment ?? 4.4;
  // Employment adjustment: each point above 4% reduces covered wages ~4.5%
  const employmentAdj = Math.max(0.72, 1 - Math.max(0, unemploymentRate - 4) * 0.045);
  // Covered wage base ≈ 33% of nominal GDP (OASDI-covered wages, calibrated to CBO 2024 ~$1,211B non-interest income)
  const payrollBase = nominalGdpB * 0.33 * employmentAdj;
  // Scale employee payroll rate to full OASDI (employer + employee both pay 6.2%)
  const oasdiRate = ((stats.payrollTaxRate ?? 7.65) / 100) * (12.4 / 7.65);
  const ssPayrollRevenue = payrollBase * oasdiRate;

  // Benefit taxation income: ~$51B under current law
  const taxationMultiplier = { 0: 0, 1: 1, 2: 1.8 }[stats.ssBenefitTaxation ?? 1] ?? 1;
  const benefitTaxIncome = 51 * taxationMultiplier;

  return { ssPayrollRevenue, benefitTaxIncome, total: ssPayrollRevenue + benefitTaxIncome };
}

/**
 * Computes effective SS spending based on retirement age, benefit multiplier, and COLA method.
 * Does NOT include the demographic growth term (that's applied weekly in macroEconomy).
 */
export function computeSSSpending(stats) {
  const ageFactor = RETIREMENT_AGE_FACTORS[stats.ssRetirementAge ?? 67] ?? 1.0;
  const colaFactor = COLA_FACTORS[String(stats.ssCOLAMethod ?? 0)] ?? 1.0;
  const benefitMult = stats.ssBenefitMultiplier ?? 1.0;
  return (stats.socialSecuritySpending ?? 1490) * ageFactor * benefitMult * colaFactor;
}

/**
 * Full SS projection given current stats, macroState, and an in-progress draft.
 * Returns all values needed for both the OverviewTab panel and the SocialSecurityModal live preview.
 *
 * @param {object} stats - current game stats
 * @param {object} macroState - current macro state (needs realGdp, priceLevel, ssTrustFundBalance)
 * @param {object} ssDraft - in-progress reform draft (may be empty {})
 * @param {number} week - current game week (for computing current game year)
 */
export function computeSSProjection(stats, macroState, ssDraft, week = 1) {
  const d = ssDraft || {};

  // Build projected stats by applying draft
  const projStats = { ...stats };
  if (d.payrollTaxDelta != null && d.payrollTaxDelta !== 0) {
    projStats.payrollTaxRate = (stats.payrollTaxRate ?? 7.65) + d.payrollTaxDelta;
  }
  if (d.retirementAge != null) projStats.ssRetirementAge = d.retirementAge;
  if (d.benefitTaxation != null) projStats.ssBenefitTaxation = d.benefitTaxation;
  if (d.colaMethod != null) projStats.ssCOLAMethod = d.colaMethod;

  // Apply benefit adjustment + formula to produce a projected multiplier
  const currentMult = stats.ssBenefitMultiplier ?? 1.0;
  const adjFactor = 1 + (d.benefitAdjustment ?? 0) / 100;
  const fmlaFactor = 1 + (d.benefitFormula ?? 0) / 100;
  projStats.ssBenefitMultiplier = currentMult * adjFactor * fmlaFactor;

  // Compute income and spending on projected stats
  const incomeResult = computeSSIncome(projStats, macroState);
  const ssIncome = incomeResult.total;
  const ssSpending = computeSSSpending(projStats);
  const annualSurplus = ssIncome - ssSpending;

  const trustFundBalance = macroState.ssTrustFundBalance ?? 2790;
  const currentGameYear = 2025 + Math.floor((week - 1) / 52);

  let insolvencyYear = null;
  if (annualSurplus < 0 && trustFundBalance > 0) {
    // Approximate years to depletion (linear — conservative but readable)
    const yearsToDepletion = trustFundBalance / Math.abs(annualSurplus);
    insolvencyYear = currentGameYear + Math.ceil(yearsToDepletion);
  } else if (trustFundBalance <= 0 && annualSurplus < 0) {
    insolvencyYear = currentGameYear; // Already insolvent
  }

  // Beneficiaries: ~20.9% of population (72M / 345M baseline), scales with game population
  const numBeneficiaries = Math.round((stats.population ?? 345426571) * 0.209);
  const avgMonthlyBenefit = numBeneficiaries > 0
    ? Math.round((ssSpending * 1e9) / (numBeneficiaries * 12))
    : 1907;

  return {
    ssIncome: Math.round(ssIncome),
    ssPayrollRevenue: Math.round(incomeResult.ssPayrollRevenue),
    benefitTaxIncome: Math.round(incomeResult.benefitTaxIncome),
    ssSpending: Math.round(ssSpending),
    annualSurplus: Math.round(annualSurplus),
    trustFundBalance: Math.round(trustFundBalance),
    insolvencyYear,
    currentGameYear,
    avgMonthlyBenefit,
    numBeneficiaries,
    projectedPayrollTaxRate: projStats.payrollTaxRate ?? 7.65,
    projectedRetirementAge: projStats.ssRetirementAge ?? 67,
  };
}

/**
 * Compute faction reactions to a proposed SS reform draft.
 * Crisis factor (0–1) dampens negative reactions when insolvency is near.
 * crisisFactor = 1 means insolvency is imminent (within 15 years → 0), dampening cuts by up to 60%.
 */
export function computeSSReactions(ssDraft, insolvencyYear, currentGameYear) {
  const d = ssDraft || {};
  const r = { prog: 0, mod_dem: 0, blue_dog: 0, freedom: 0, mod_rep: 0, trad_con: 0 };
  const c = (v) => Math.max(-1, Math.min(1, v));

  const yearsToInsolvency = insolvencyYear ? Math.max(0, insolvencyYear - currentGameYear) : 20;
  // 0 = plenty of time, 1 = imminent (within 15 years)
  const crisisFactor = Math.max(0, 1 - yearsToInsolvency / 15);

  // Payroll tax increase: workers (all factions) bear cost; conservatives most opposed
  if (d.payrollTaxDelta) {
    const delta = d.payrollTaxDelta;
    r.prog = c(r.prog + delta * 0.040);
    r.mod_dem = c(r.mod_dem + delta * 0.025);
    r.blue_dog = c(r.blue_dog - delta * 0.020);
    r.freedom = c(r.freedom - delta * 0.060);
    r.mod_rep = c(r.mod_rep - delta * 0.040);
    r.trad_con = c(r.trad_con - delta * 0.025);
  }

  // Benefit adjustment: cuts broadly unpopular; crisis softens opposition to cuts
  if (d.benefitAdjustment != null && d.benefitAdjustment !== 0) {
    const rawPct = d.benefitAdjustment; // e.g. -20 = 20% cut, +30 = 30% increase
    // Dampening: negative changes (cuts) are less damaging when crisis is near
    const dampenedPct = rawPct < 0 ? rawPct * (1 - crisisFactor * 0.6) : rawPct;
    r.prog = c(r.prog + dampenedPct * 0.025);
    r.mod_dem = c(r.mod_dem + dampenedPct * 0.018);
    r.blue_dog = c(r.blue_dog + dampenedPct * 0.012);
    // freedom faction mildly favors fiscal cuts, but this shifts with crisis
    r.freedom = c(r.freedom - dampenedPct * 0.004);
    r.mod_rep = c(r.mod_rep + dampenedPct * 0.003);
    // trad_con values SS (senior voters = GOP base) so even they dislike deep cuts
    r.trad_con = c(r.trad_con + dampenedPct * 0.008);
  }

  // Benefit formula (PIA) adjustment: structurally similar to across-the-board
  if (d.benefitFormula != null && d.benefitFormula !== 0) {
    const rawPct = d.benefitFormula;
    const dampenedPct = rawPct < 0 ? rawPct * (1 - crisisFactor * 0.5) : rawPct;
    r.prog = c(r.prog + dampenedPct * 0.018);
    r.mod_dem = c(r.mod_dem + dampenedPct * 0.012);
    r.blue_dog = c(r.blue_dog + dampenedPct * 0.008);
    r.freedom = c(r.freedom - dampenedPct * 0.003);
    r.mod_rep = c(r.mod_rep + dampenedPct * 0.002);
    r.trad_con = c(r.trad_con + dampenedPct * 0.006);
  }

  // Retirement age: raising it is unpopular with labor/progressives; fiscally popular
  if (d.retirementAge != null) {
    const ageDelta = d.retirementAge - 67; // positive = raising
    // Near crisis, blue_dogs and mod_reps flip to support raising it
    const crisisSwing = ageDelta > 0 ? crisisFactor * 0.08 : 0;
    r.prog = c(r.prog - ageDelta * 0.25);
    r.mod_dem = c(r.mod_dem - ageDelta * 0.15);
    r.blue_dog = c(r.blue_dog - ageDelta * 0.10 + crisisSwing);
    r.freedom = c(r.freedom + ageDelta * 0.10);
    r.mod_rep = c(r.mod_rep + ageDelta * 0.08 + crisisSwing);
    r.trad_con = c(r.trad_con - ageDelta * 0.05); // seniors vote; raising age hurts them
  }

  // Benefit taxation: 0=eliminate (universal popular), 1=current law (baseline), 2=expand (taxing more)
  if (d.benefitTaxation != null) {
    const taxDelta = 1 - d.benefitTaxation; // +1=eliminate(less tax), -1=expand(more tax)
    r.prog = c(r.prog + taxDelta * 0.15);
    r.mod_dem = c(r.mod_dem + taxDelta * 0.12);
    r.blue_dog = c(r.blue_dog + taxDelta * 0.08);
    r.freedom = c(r.freedom + taxDelta * 0.10);
    r.mod_rep = c(r.mod_rep + taxDelta * 0.10);
    r.trad_con = c(r.trad_con + taxDelta * 0.12);
  }

  // COLA method: CPI-E (more generous) popular with beneficiaries; chained saves money
  if (d.colaMethod != null) {
    const colaDelta = d.colaMethod; // -1=chained(cheaper), 0=current, +1=CPI-E(generous)
    const dampenedCola = colaDelta < 0 ? colaDelta * (1 - crisisFactor * 0.4) : colaDelta;
    r.prog = c(r.prog + dampenedCola * 0.25);
    r.mod_dem = c(r.mod_dem + dampenedCola * 0.18);
    r.blue_dog = c(r.blue_dog + dampenedCola * 0.08);
    r.freedom = c(r.freedom - dampenedCola * 0.15);
    r.mod_rep = c(r.mod_rep - dampenedCola * 0.08);
    r.trad_con = c(r.trad_con + dampenedCola * 0.10); // seniors like better COLA
  }

  // Earnings test removal: broadly popular (lets seniors work freely)
  if (d.earningsTest === 1) {
    r.prog = c(r.prog + 0.08);
    r.mod_dem = c(r.mod_dem + 0.06);
    r.blue_dog = c(r.blue_dog + 0.05);
    r.freedom = c(r.freedom + 0.12);
    r.mod_rep = c(r.mod_rep + 0.08);
    r.trad_con = c(r.trad_con + 0.04);
  }

  return r;
}
