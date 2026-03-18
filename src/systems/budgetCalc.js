/** Pure function: compute faction reactions to a proposed budget draft.
 *  Each key in draft is a fractional change (e.g. 0.05 = +5%).
 *  Returns a map of factionId → reaction in [-1, 1].
 */
export const computeBudgetReactions = (draft) => {
  const r = { prog: 0, mod_dem: 0, blue_dog: 0, freedom: 0, mod_rep: 0, trad_con: 0 };
  const c = v => Math.max(-1, Math.min(1, v));
  const d = draft;

  if (d.corporateTaxRate != null) {
    r.freedom  = c(r.freedom  - d.corporateTaxRate * 2);
    r.mod_rep  = c(r.mod_rep  - d.corporateTaxRate * 1.5);
    r.trad_con = c(r.trad_con - d.corporateTaxRate * 0.8);
    r.prog     = c(r.prog     + d.corporateTaxRate * 1.5);
    r.mod_dem  = c(r.mod_dem  + d.corporateTaxRate * 0.8);
  }
  if (d.incomeTaxHigh != null) {
    r.prog    = c(r.prog    + d.incomeTaxHigh * 2);
    r.mod_dem = c(r.mod_dem + d.incomeTaxHigh * 0.5);
    r.freedom = c(r.freedom - d.incomeTaxHigh * 2);
    r.mod_rep = c(r.mod_rep - d.incomeTaxHigh * 1);
  }
  if (d.incomeTaxMid != null) {
    r.prog    = c(r.prog    + d.incomeTaxMid * 1);
    r.freedom = c(r.freedom - d.incomeTaxMid * 1.5);
    r.mod_rep = c(r.mod_rep - d.incomeTaxMid * 0.8);
  }
  if (d.incomeTaxLow != null) {
    r.prog     = c(r.prog     + d.incomeTaxLow * 0.5);
    r.freedom  = c(r.freedom  - d.incomeTaxLow * 1);
    r.blue_dog = c(r.blue_dog - d.incomeTaxLow * 0.5);
  }
  if (d.payrollTaxRate != null) {
    r.prog     = c(r.prog     + d.payrollTaxRate * 1);
    r.mod_dem  = c(r.mod_dem  + d.payrollTaxRate * 0.5);
    r.freedom  = c(r.freedom  - d.payrollTaxRate * 1);
    r.blue_dog = c(r.blue_dog - d.payrollTaxRate * 0.3);
  }
  if (d.healthcareSpending != null) {
    r.prog    = c(r.prog    + d.healthcareSpending * 2);
    r.mod_dem = c(r.mod_dem + d.healthcareSpending * 1);
    r.freedom = c(r.freedom - d.healthcareSpending * 2);
    r.mod_rep = c(r.mod_rep - d.healthcareSpending * 0.5);
  }
  if (d.socialSecuritySpending != null) {
    r.prog     = c(r.prog     + d.socialSecuritySpending * 1.2);
    r.mod_dem  = c(r.mod_dem  + d.socialSecuritySpending * 1);
    r.blue_dog = c(r.blue_dog + d.socialSecuritySpending * 0.3);
    r.freedom  = c(r.freedom  - d.socialSecuritySpending * 1.3);
    r.mod_rep  = c(r.mod_rep  - d.socialSecuritySpending * 0.5);
    r.trad_con = c(r.trad_con - d.socialSecuritySpending * 0.3);
  }
  if (d.militarySpending != null) {
    r.trad_con = c(r.trad_con + d.militarySpending * 1.5);
    r.freedom  = c(r.freedom  + d.militarySpending * 0.5);
    r.mod_rep  = c(r.mod_rep  + d.militarySpending * 0.8);
    r.prog     = c(r.prog     - d.militarySpending * 1.5);
    r.mod_dem  = c(r.mod_dem  - d.militarySpending * 0.3);
  }
  if (d.educationSpending != null) {
    r.prog     = c(r.prog     + d.educationSpending * 1.5);
    r.mod_dem  = c(r.mod_dem  + d.educationSpending * 0.5);
    r.freedom  = c(r.freedom  - d.educationSpending * 1);
    r.trad_con = c(r.trad_con + d.educationSpending * 0.3);
  }
  if (d.infrastructureSpending != null) {
    r.prog     = c(r.prog     + d.infrastructureSpending * 0.5);
    r.mod_dem  = c(r.mod_dem  + d.infrastructureSpending * 0.8);
    r.mod_rep  = c(r.mod_rep  + d.infrastructureSpending * 0.5);
    r.blue_dog = c(r.blue_dog + d.infrastructureSpending * 0.5);
    r.freedom  = c(r.freedom  - d.infrastructureSpending * 0.5);
  }
  if (d.otherSpending != null) {
    r.prog     = c(r.prog     + d.otherSpending * 0.4);
    r.mod_dem  = c(r.mod_dem  + d.otherSpending * 0.3);
    r.blue_dog = c(r.blue_dog + d.otherSpending * 0.2);
    r.mod_rep  = c(r.mod_rep  + d.otherSpending * 0.1);
    r.freedom  = c(r.freedom  - d.otherSpending * 0.4);
    r.trad_con = c(r.trad_con - d.otherSpending * 0.1);
  }
  return r;
};
