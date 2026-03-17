export function calcStateApproval(state, stats, playerParty, stateBonuses) {
  const base = playerParty === "DEM" ? (1 - state.lean) * 100 : state.lean * 100;
  let approval = base * 0.5 + stats.approvalRating * 0.3;

  // Macro-economic effects
  if (stats.gasPrice > 4) approval -= (stats.gasPrice - 4) * 2.5;
  if (stats.unemployment > 5) approval -= (stats.unemployment - 5) * 2.5;
  if (stats.gdpGrowth > 2.5) approval += (stats.gdpGrowth - 2.5) * 1.5;
  if (stats.inflation > 3) approval -= (stats.inflation - 3) * 2;

  // State economy-type sensitivity
  const econ = state.economy;
  if (econ === "energy" && stats.gasPrice > 3.5) approval += (stats.gasPrice - 3.5) * 1.2;
  if (econ === "tech" && stats.gdpGrowth > 2) approval += (stats.gdpGrowth - 2) * 1.5;
  if (econ === "agriculture" && stats.inflation > 2.5) approval -= (stats.inflation - 2.5) * 1.0;
  if (econ === "manufacturing" && stats.unemployment > 4.5) approval -= (stats.unemployment - 4.5) * 1.2;
  if (econ === "finance" && stats.gdpGrowth > 2) approval += (stats.gdpGrowth - 2) * 0.8;
  if (econ === "tourism" && stats.gasPrice > 4) approval -= (stats.gasPrice - 4) * 0.8;

  // High crime hurts urban states more
  if (stats.crimeRate > 5 && state.urbanization > 0.7) {
    approval -= (stats.crimeRate - 5) * 0.8;
  }

  // High deficit slightly hurts in fiscally conservative states
  if (stats.nationalDeficit && stats.nationalDeficit > 2500 && state.lean > 0.55) {
    approval -= (stats.nationalDeficit - 2500) * 0.0005;
  }

  // State bonuses from visits, bills, speeches (decays weekly in advance())
  approval += (stateBonuses[state.abbr] || 0) * 100;

  return Math.max(12, Math.min(88, approval));
}
