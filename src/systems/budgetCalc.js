/** Pure function: compute faction reactions to a proposed budget draft.
 *  Tax-rate keys are absolute percentage-point changes.
 *  Spending keys remain fractional changes (e.g. 0.05 = +5%).
 *  Policy-setting keys are absolute target values.
 */
export const computeBudgetReactions = (draft) => {
  const r = { prog: 0, mod_dem: 0, blue_dog: 0, freedom: 0, mod_rep: 0, trad_con: 0 };
  const c = (v) => Math.max(-1, Math.min(1, v));
  const d = draft || {};

  const applyTaxPointShift = (delta, weights) => {
    if (!delta) return;
    Object.entries(weights).forEach(([factionId, weight]) => {
      r[factionId] = c(r[factionId] + delta * weight);
    });
  };

  applyTaxPointShift(d.corporateTaxRate, {
    prog: 0.055,
    mod_dem: 0.03,
    blue_dog: 0.01,
    freedom: -0.06,
    mod_rep: -0.05,
    trad_con: -0.03,
  });
  applyTaxPointShift(d.incomeTaxHigh, {
    prog: 0.06,
    mod_dem: 0.03,
    blue_dog: 0.01,
    freedom: -0.06,
    mod_rep: -0.04,
    trad_con: -0.02,
  });
  applyTaxPointShift(d.incomeTaxMid, {
    prog: 0.03,
    mod_dem: 0.01,
    blue_dog: -0.01,
    freedom: -0.04,
    mod_rep: -0.03,
    trad_con: -0.02,
  });
  applyTaxPointShift(d.incomeTaxLow, {
    prog: 0.02,
    mod_dem: 0.01,
    blue_dog: -0.02,
    freedom: -0.03,
    mod_rep: -0.02,
    trad_con: -0.01,
  });
  applyTaxPointShift(d.payrollTaxRate, {
    prog: 0.045,
    mod_dem: 0.025,
    blue_dog: -0.02,
    freedom: -0.05,
    mod_rep: -0.03,
    trad_con: -0.02,
  });

  const applySpendingShift = (delta, weights) => {
    if (delta == null) return;
    Object.entries(weights).forEach(([factionId, weight]) => {
      r[factionId] = c(r[factionId] + delta * weight);
    });
  };

  applySpendingShift(d.militarySpending, {
    trad_con: 1.6,
    freedom: 0.6,
    mod_rep: 0.9,
    prog: -1.6,
    mod_dem: -0.35,
  });
  applySpendingShift(d.educationSpending, {
    prog: 1.5,
    mod_dem: 0.6,
    blue_dog: 0.2,
    freedom: -1,
    trad_con: -0.15,
  });
  applySpendingShift(d.infrastructureSpending, {
    prog: 0.6,
    mod_dem: 0.9,
    blue_dog: 0.7,
    mod_rep: 0.4,
    freedom: -0.6,
  });
  applySpendingShift(d.otherSpending, {
    prog: 0.4,
    mod_dem: 0.3,
    blue_dog: 0.1,
    freedom: -0.5,
    trad_con: -0.2,
  });
  applySpendingShift(d.scienceTechnologySpending, {
    prog: 1.1,
    mod_dem: 0.55,
    blue_dog: 0.15,
    freedom: -0.45,
    mod_rep: -0.05,
    trad_con: -0.12,
  });
  applySpendingShift(d.lawEnforcementSpending, {
    prog: -0.55,
    mod_dem: -0.12,
    blue_dog: 0.35,
    freedom: 0.18,
    mod_rep: 0.45,
    trad_con: 0.32,
  });
  applySpendingShift(d.agricultureSpending, {
    prog: 0.04,
    mod_dem: 0.12,
    blue_dog: 0.48,
    freedom: -0.05,
    mod_rep: 0.22,
    trad_con: 0.18,
  });
  applySpendingShift(d.energyEnvironmentSpending, {
    prog: 1.2,
    mod_dem: 0.65,
    blue_dog: 0.12,
    freedom: -0.7,
    mod_rep: -0.15,
    trad_con: -0.24,
  });
  applySpendingShift(d.irsFunding, {
    prog: 1.4,
    mod_dem: 0.7,
    blue_dog: 0.1,
    freedom: -1.65,
    mod_rep: -0.95,
    trad_con: -0.6,
  });

  if (d.medicareEligibilityAge != null) {
    const delta = 65 - d.medicareEligibilityAge;
    r.prog = c(r.prog + delta * 0.18);
    r.mod_dem = c(r.mod_dem + delta * 0.11);
    r.blue_dog = c(r.blue_dog + delta * 0.02);
    r.freedom = c(r.freedom - delta * 0.18);
    r.mod_rep = c(r.mod_rep - delta * 0.08);
    r.trad_con = c(r.trad_con - delta * 0.06);
  }
  if (d.drugPriceNegotiationLevel != null) {
    const delta = d.drugPriceNegotiationLevel - 1;
    r.prog = c(r.prog + delta * 0.28);
    r.mod_dem = c(r.mod_dem + delta * 0.18);
    r.blue_dog = c(r.blue_dog + delta * 0.06);
    r.freedom = c(r.freedom - delta * 0.15);
    r.mod_rep = c(r.mod_rep - delta * 0.14);
    r.trad_con = c(r.trad_con - delta * 0.08);
  }
  if (d.healthcareSubsidyLevel != null) {
    const delta = d.healthcareSubsidyLevel;
    r.prog = c(r.prog + delta * 0.26);
    r.mod_dem = c(r.mod_dem + delta * 0.2);
    r.blue_dog = c(r.blue_dog + delta * 0.04);
    r.freedom = c(r.freedom - delta * 0.2);
    r.mod_rep = c(r.mod_rep - delta * 0.1);
    r.trad_con = c(r.trad_con - delta * 0.08);
  }

  if (d.childTaxCredit != null) {
    const delta = (d.childTaxCredit - 2000) / 1000;
    r.prog = c(r.prog + delta * 0.14);
    r.mod_dem = c(r.mod_dem + delta * 0.1);
    r.blue_dog = c(r.blue_dog + delta * 0.04);
    r.freedom = c(r.freedom - delta * 0.08);
    r.trad_con = c(r.trad_con + delta * 0.08);
  }
  if (d.earnedIncomeTaxCredit != null) {
    const delta = (d.earnedIncomeTaxCredit - 7830) / 2000;
    r.prog = c(r.prog + delta * 0.18);
    r.mod_dem = c(r.mod_dem + delta * 0.1);
    r.blue_dog = c(r.blue_dog + delta * 0.05);
    r.freedom = c(r.freedom - delta * 0.1);
    r.mod_rep = c(r.mod_rep - delta * 0.06);
  }
  if (d.saltDeductionCap != null) {
    const delta = d.saltDeductionCap < 0 ? 3 : (d.saltDeductionCap - 10000) / 10000;
    r.prog = c(r.prog + delta * 0.03);
    r.mod_dem = c(r.mod_dem + delta * 0.12);
    r.blue_dog = c(r.blue_dog + delta * 0.06);
    r.freedom = c(r.freedom - delta * 0.05);
    r.mod_rep = c(r.mod_rep + delta * 0.05);
    r.trad_con = c(r.trad_con - delta * 0.04);
  }
  if (d.firstTimeHomebuyerTaxCredit != null) {
    const delta = d.firstTimeHomebuyerTaxCredit / 5000;
    r.prog = c(r.prog + delta * 0.06);
    r.mod_dem = c(r.mod_dem + delta * 0.12);
    r.blue_dog = c(r.blue_dog + delta * 0.07);
    r.freedom = c(r.freedom - delta * 0.06);
    r.mod_rep = c(r.mod_rep + delta * 0.03);
    r.trad_con = c(r.trad_con + delta * 0.02);
  }
  if (d.evTaxCredit != null) {
    const delta = (d.evTaxCredit - 7500) / 2500;
    r.prog = c(r.prog + delta * 0.1);
    r.mod_dem = c(r.mod_dem + delta * 0.06);
    r.blue_dog = c(r.blue_dog - delta * 0.01);
    r.freedom = c(r.freedom - delta * 0.08);
    r.mod_rep = c(r.mod_rep - delta * 0.03);
    r.trad_con = c(r.trad_con - delta * 0.04);
  }
  if (d.renewableInvestmentTaxCredit != null) {
    const delta = (d.renewableInvestmentTaxCredit - 30) / 10;
    r.prog = c(r.prog + delta * 0.14);
    r.mod_dem = c(r.mod_dem + delta * 0.08);
    r.blue_dog = c(r.blue_dog + delta * 0.02);
    r.freedom = c(r.freedom - delta * 0.1);
    r.mod_rep = c(r.mod_rep - delta * 0.04);
    r.trad_con = c(r.trad_con - delta * 0.04);
  }

  return r;
};
