const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const TREND_GDP_GROWTH = 2.2;
export const NATURAL_UNEMPLOYMENT = 4.4;
export const INFLATION_TARGET = 2.2;
export const FED_PERSONALITIES = ["HAWKISH", "NEUTRAL", "DOVISH"];

const BASELINE_NOMINAL_GDP = 28.0;
const BASELINE_PRICE_LEVEL = 100;
const BASELINE_REAL_GDP = BASELINE_NOMINAL_GDP / (BASELINE_PRICE_LEVEL / 100);
const BASELINE_SPENDING = 8146;
const BASELINE_HOUSING_STARTS = 1366900;
const BASELINE_PRODUCTIVITY = 65;
const BASELINE_CONSUMER_CONFIDENCE = 51;
const FED_MEETING_INTERVAL_WEEKS = 6;

const PERSONALITY_CONFIG = {
  HAWKISH: { inflationWeight: 1.15, outputGapWeight: 0.35, cutDamping: 0.65, hikeDamping: 1.0 },
  NEUTRAL: { inflationWeight: 0.95, outputGapWeight: 0.5, cutDamping: 0.8, hikeDamping: 0.9 },
  DOVISH: { inflationWeight: 0.75, outputGapWeight: 0.65, cutDamping: 0.95, hikeDamping: 0.75 },
};

export const INITIAL_MACRO_STATE = {
  fedChairName: "Evelyn Hart",
  fedChairStartWeek: 1,
  fedFundsRate: 4.5,
  governorPersonality: "NEUTRAL",
  fedVacant: false,
  fedDecisionSummary: "Rates unchanged near neutral.",
  lastFedDecisionWeek: 0,
  realGdpGrowth: TREND_GDP_GROWTH,
  potentialGdpGrowth: 2.1,
  outputGap: 0,
  educationQuality: 50,
  infrastructureQuality: 50,
  technologicalAdvancement: 50,
  productivity: 50,
  consumerConfidence: 51,
  businessConfidence: 50,
  priceLevel: BASELINE_PRICE_LEVEL,
  potentialRealGdp: BASELINE_REAL_GDP,
  realGdp: BASELINE_REAL_GDP,
  consumptionShare: 0.67,
  investmentShare: 0.18,
  netExportsShare: -0.025,
  taxRevenue: 6326,
  housingStarts: BASELINE_HOUSING_STARTS,
  housingStartsLag: BASELINE_HOUSING_STARTS,
  housingStartsMomentum: 0,
  lastUnemployment: NATURAL_UNEMPLOYMENT,
  impulses: {
    demand: 0,
    investment: 0,
    price: 0,
    labor: 0,
    technology: 0,
    productivity: 0,
    confidence: 0,
    nx: 0,
  },
};

export function createInitialMacroState(initialFedChairName = "Evelyn Hart") {
  return {
    ...INITIAL_MACRO_STATE,
    fedChairName: initialFedChairName,
    impulses: { ...INITIAL_MACRO_STATE.impulses },
  };
}

export function pickFedChairName(nameRegistry) {
  return nameRegistry.drawName("Fed Chair");
}

export function getTotalFederalSpending(stats) {
  return (
    (stats.militarySpending || 0)
    + (stats.educationSpending || 0)
    + (stats.healthcareSpending || 0)
    + (stats.socialSecuritySpending || 0)
    + (stats.infrastructureSpending || 0)
    + (stats.otherSpending || 0)
    + (stats.scienceTechnologySpending || 0)
    + (stats.lawEnforcementSpending || 0)
    + (stats.agricultureSpending || 0)
    + (stats.energyEnvironmentSpending || 0)
    + 3200
  );
}

export function getEffectiveIncomeTaxRate(stats) {
  const low = (stats.incomeTaxLow || 0) / 100;
  const mid = (stats.incomeTaxMid || 0) / 100;
  const high = (stats.incomeTaxHigh || 0) / 100;
  return low * 0.18 + mid * 0.52 + high * 0.30;
}

export function computeFiscalState(stats, macroState) {
  const nominalGdpB = (macroState.realGdp * (macroState.priceLevel / 100)) * 1000;
  const effectiveIncomeTaxRate = getEffectiveIncomeTaxRate(stats);
  const payrollRate = (stats.payrollTaxRate || 0) / 100;
  const corporateRate = (stats.corporateTaxRate || 0) / 100;
  const cleanVehicleTaxCreditCost = Math.max(0, stats.cleanVehicleTaxCreditCost || 0);
  const unemployment = stats.unemployment ?? NATURAL_UNEMPLOYMENT;

  const employmentAdjustment = clamp(1 - Math.max(0, unemployment - 4) * 0.045, 0.72, 1.03);
  const incomeCompliance = clamp(1 - Math.max(0, effectiveIncomeTaxRate - 0.24) * 1.25, 0.72, 1.02);
  const payrollCompliance = clamp(1 - Math.max(0, payrollRate - 0.085) * 1.05, 0.82, 1.01);
  const corporateCompliance = clamp(1 - Math.max(0, corporateRate - 0.22) * 1.45, 0.62, 1.02);
  const profitCycleAdjustment = clamp(
    1 + (macroState.businessConfidence - 50) / 180 + (macroState.outputGap / 10),
    0.72,
    1.3
  );

  const laborIncomeBase = nominalGdpB * 0.50 * employmentAdjustment;
  const payrollBase = nominalGdpB * 0.38 * employmentAdjustment;
  const corporateProfitBase = nominalGdpB * 0.13 * profitCycleAdjustment;

  const personalIncomeRevenue = laborIncomeBase * effectiveIncomeTaxRate * incomeCompliance;
  const payrollRevenue = payrollBase * payrollRate * payrollCompliance;
  const corporateRevenue = corporateProfitBase * corporateRate * corporateCompliance;

  const taxRevenue = personalIncomeRevenue + payrollRevenue + corporateRevenue - cleanVehicleTaxCreditCost;
  const totalSpending = getTotalFederalSpending(stats);
  const nationalDeficit = Math.round(totalSpending - taxRevenue);

  return {
    taxRevenue: Math.round(taxRevenue),
    totalSpending,
    nationalDeficit,
  };
}

export function deriveVisibleStats(stats, macroState) {
  const fiscal = computeFiscalState(stats, macroState);
  return {
    ...stats,
    gdpGrowth: Number(macroState.realGdpGrowth.toFixed(2)),
    realGdpGrowth: Number(macroState.realGdpGrowth.toFixed(2)),
    potentialGdpGrowth: Number(macroState.potentialGdpGrowth.toFixed(2)),
    outputGap: Number(macroState.outputGap.toFixed(2)),
    nominalGdp: Number((macroState.realGdp * (macroState.priceLevel / 100)).toFixed(2)),
    unemployment: Number((stats.unemployment ?? NATURAL_UNEMPLOYMENT).toFixed(2)),
    inflation: Number((stats.inflation ?? INFLATION_TARGET).toFixed(2)),
    fedFundsRate: Number(macroState.fedFundsRate.toFixed(2)),
    housingStarts: Math.round(macroState.housingStarts),
    taxRevenue: fiscal.taxRevenue,
    nationalDeficit: fiscal.nationalDeficit,
  };
}

export function adaptLegacyEffectsToMacroImpulses(macroState, effects = {}, sourceMeta = {}, mult = 1) {
  const impulses = { ...macroState.impulses };
  const sourceId = `${sourceMeta.id || ""} ${sourceMeta.name || ""} ${sourceMeta.category || ""}`.toLowerCase();

  Object.entries(effects).forEach(([key, rawValue]) => {
    const value = rawValue * mult;
    if (key === "gdpGrowth") {
      impulses.demand += value * 0.55;
      if (sourceId.includes("infra")) impulses.productivity += value * 0.2;
      if (sourceId.includes("science") || sourceId.includes("nasa") || sourceId.includes("tech")) {
        impulses.technology += value * 0.35;
        impulses.investment += value * 0.15;
      }
      if (sourceId.includes("trade")) impulses.nx += value * 0.2;
    }
    if (key === "unemployment") {
      impulses.labor += value;
      impulses.confidence -= value * 0.6;
    }
    if (key === "inflation") {
      impulses.price += value;
    }
    if (key === "tradeBalance") {
      impulses.nx += value / 8;
    }
    if (key === "scienceTechnologySpending") {
      impulses.technology += value / 80;
    }
    if (key === "educationSpending") {
      impulses.productivity += value / 180;
    }
    if (key === "infrastructureSpending") {
      impulses.productivity += value / 140;
    }
  });

  return {
    ...macroState,
    impulses,
  };
}

export function applyMacroEffects(macroState, macroEffects = {}, mult = 1) {
  const nextMacroState = {
    ...macroState,
    impulses: { ...macroState.impulses },
  };

  Object.entries(macroEffects || {}).forEach(([key, rawValue]) => {
    const value = rawValue * mult;
    if (!value) return;

    if (["demand", "investment", "price", "labor", "technology", "productivity", "confidence", "nx"].includes(key)) {
      nextMacroState.impulses[key] += value;
      return;
    }

    if (key === "educationQuality") {
      nextMacroState.educationQuality = clamp(nextMacroState.educationQuality + value, 20, 100);
      return;
    }
    if (key === "infrastructureQuality") {
      nextMacroState.infrastructureQuality = clamp(nextMacroState.infrastructureQuality + value, 20, 100);
      return;
    }
    if (key === "technologicalAdvancement") {
      nextMacroState.technologicalAdvancement = clamp(nextMacroState.technologicalAdvancement + value, 20, 100);
      return;
    }
    if (key === "consumerConfidence") {
      nextMacroState.consumerConfidence = clamp(nextMacroState.consumerConfidence + value, 20, 85);
      return;
    }
    if (key === "businessConfidence") {
      nextMacroState.businessConfidence = clamp(nextMacroState.businessConfidence + value, 20, 85);
    }
  });

  return nextMacroState;
}

function applyImpulseDecay(impulses) {
  return Object.fromEntries(
    Object.entries(impulses).map(([key, value]) => [key, Number((value * 0.86).toFixed(4))])
  );
}

function nextFedDecision(macroState, inflation, outputGap) {
  const personality = macroState.governorPersonality || "NEUTRAL";
  const cfg = PERSONALITY_CONFIG[personality] || PERSONALITY_CONFIG.NEUTRAL;
  const neutralRate = 2.6;
  const targetRate = neutralRate
    + (inflation - INFLATION_TARGET) * cfg.inflationWeight
    + outputGap * cfg.outputGapWeight;
  let rateDelta = clamp(targetRate - macroState.fedFundsRate, -0.75, 0.75);
  if (rateDelta > 0) rateDelta *= cfg.hikeDamping;
  else rateDelta *= cfg.cutDamping;
  const fedFundsRate = clamp(macroState.fedFundsRate + rateDelta, 1, 8);

  let direction = "held";
  if (fedFundsRate > macroState.fedFundsRate + 0.05) direction = "raised";
  if (fedFundsRate < macroState.fedFundsRate - 0.05) direction = "cut";

  return {
    fedFundsRate,
    fedDecisionSummary: `${macroState.fedChairName} ${direction} rates with inflation at ${inflation.toFixed(1)}% and output gap at ${outputGap.toFixed(1)}%.`,
  };
}

export function advanceMacroEconomy(currentMacroState, currentStats, week, randoms = {}) {
  const macroState = {
    ...currentMacroState,
    impulses: { ...currentMacroState.impulses },
  };

  const educationSpendingGap = ((currentStats.educationSpending || 102) - 102) / 102;
  const infrastructureSpendingGap = ((currentStats.infrastructureSpending || 110) - 110) / 110;
  const scienceSpendingGap = ((currentStats.scienceTechnologySpending || 45) - 45) / 45;
  const laggedUnemployment = currentMacroState.lastUnemployment ?? currentStats.unemployment ?? NATURAL_UNEMPLOYMENT;

  macroState.educationQuality = clamp(
    macroState.educationQuality + educationSpendingGap * 0.12 + macroState.impulses.productivity * 0.04,
    20,
    100
  );
  macroState.infrastructureQuality = clamp(
    macroState.infrastructureQuality + infrastructureSpendingGap * 0.14 + macroState.impulses.productivity * 0.05,
    20,
    100
  );
  macroState.technologicalAdvancement = clamp(
    macroState.technologicalAdvancement
      + 0.015
      + scienceSpendingGap * 0.12
      + macroState.impulses.technology * 0.08
      - Math.max(0, macroState.fedFundsRate - 5) * 0.01,
    20,
    100
  );

  macroState.productivity = clamp(
    15
      + macroState.educationQuality * 0.32
      + macroState.infrastructureQuality * 0.29
      + macroState.technologicalAdvancement * 0.39,
    0,
    100
  );

  const inflation = currentStats.inflation ?? INFLATION_TARGET;
  const unemployment = currentStats.unemployment ?? NATURAL_UNEMPLOYMENT;
  macroState.consumerConfidence = clamp(
    macroState.consumerConfidence * 0.8
      + 50
      + (macroState.outputGap * 4)
      - Math.max(0, inflation - INFLATION_TARGET) * 3.2
      - Math.max(0, currentStats.gasPrice - 3.5) * 2.1
      - Math.max(0, unemployment - NATURAL_UNEMPLOYMENT) * 3.6
      + macroState.impulses.confidence * 4,
    20,
    85
  );
  macroState.businessConfidence = clamp(
    macroState.businessConfidence * 0.78
      + 50
      + (macroState.productivity - 50) * 0.08
      - Math.max(0, macroState.fedFundsRate - 4) * 3.1
      - Math.max(0, (currentStats.corporateTaxRate || 21) - 21) * 0.35
      + macroState.impulses.investment * 4,
    20,
    85
  );

  macroState.consumptionShare = clamp(
    macroState.consumptionShare * 0.88 + 0.67 * 0.12 + (macroState.consumerConfidence - 50) / 2500,
    0.58,
    0.74
  );
  macroState.investmentShare = clamp(
    macroState.investmentShare * 0.85 + 0.18 * 0.15 + (macroState.businessConfidence - 50) / 2600 - Math.max(0, macroState.fedFundsRate - 4) / 220,
    0.12,
    0.24
  );
  macroState.netExportsShare = clamp(
    macroState.netExportsShare * 0.9 + ((currentStats.tradeBalance || -67.4) / 1000) * 0.1 + macroState.impulses.nx / 250,
    -0.06,
    0.03
  );

  const housingNoise = ((randoms.housing ?? Math.random()) - 0.5) * 18000;
  const housingSignal = (
    (macroState.consumerConfidence - BASELINE_CONSUMER_CONFIDENCE) * 4200
    - (macroState.fedFundsRate - 4.5) * 42000
    - (laggedUnemployment - NATURAL_UNEMPLOYMENT) * 28000
    - (inflation - INFLATION_TARGET) * 18000
    + (macroState.productivity - BASELINE_PRODUCTIVITY) * 3200
    + macroState.impulses.investment * 22000
  );
  const nextHousingMomentum = clamp(
    (macroState.housingStartsMomentum || 0) * 0.45 + housingSignal + housingNoise,
    -90000,
    90000
  );
  const nextHousingStarts = clamp(
    macroState.housingStarts
      + nextHousingMomentum
      + (BASELINE_HOUSING_STARTS - macroState.housingStarts) * 0.08,
    700000,
    2200000
  );
  const housingMomentum = clamp(
    (nextHousingStarts - (macroState.housingStartsLag || BASELINE_HOUSING_STARTS)) / BASELINE_HOUSING_STARTS,
    -0.08,
    0.08
  );

  const fiscal = computeFiscalState(
    {
      ...currentStats,
      unemployment,
      inflation,
    },
    macroState
  );
  const governmentDemand = ((fiscal.totalSpending - BASELINE_SPENDING) / BASELINE_SPENDING) * 2.8;
  const consumptionImpulse = ((macroState.consumerConfidence - 50) / 24)
    - Math.max(0, unemployment - NATURAL_UNEMPLOYMENT) * 0.35
    - Math.max(0, inflation - INFLATION_TARGET) * 0.22
    - Math.max(0, currentStats.gasPrice - 3.5) * 0.12
    + macroState.impulses.demand * 0.55;
  const investmentImpulse = ((macroState.businessConfidence - 50) / 28)
    + (macroState.productivity - 50) * 0.015
    - Math.max(0, macroState.fedFundsRate - 4) * 0.28
    - Math.max(0, (currentStats.corporateTaxRate || 21) - 21) * 0.03
    + housingMomentum * 0.75
    + macroState.impulses.investment * 0.45;
  const netExportsImpulse = ((currentStats.tradeBalance || -67.4) + 67.4) / 38
    - Math.max(0, macroState.outputGap) * 0.12
    + macroState.impulses.nx * 0.28;

  macroState.potentialGdpGrowth = clamp(
    1.55
      + (macroState.productivity - 50) * 0.025
      + Math.max(0, (currentStats.immigrationRate || 1.1) - 1.1) * 0.18,
    1,
    4.2
  );

  const demandGrowth = clamp(
    macroState.potentialGdpGrowth
      + consumptionImpulse * 0.35
      + investmentImpulse * 0.28
      + governmentDemand * 0.17
      + netExportsImpulse * 0.16,
    -3,
    6.5
  );
  const realGdpNoise = ((randoms.growth ?? Math.random()) - 0.5) * 0.08;
  macroState.realGdpGrowth = clamp(
    macroState.realGdpGrowth * 0.42
      + demandGrowth * 0.4
      + macroState.potentialGdpGrowth * 0.18
      + macroState.impulses.productivity * 0.12
      + realGdpNoise,
    -2.5,
    6
  );

  const priorOutputGap = macroState.outputGap;
  macroState.outputGap = clamp(
    macroState.outputGap * 0.68
      + (macroState.realGdpGrowth - macroState.potentialGdpGrowth) * 0.42
      - macroState.impulses.labor * 0.08,
    -4,
    4
  );

  const inflationNoise = ((randoms.inflation ?? Math.random()) - 0.5) * 0.05;
  const nextInflation = clamp(
    inflation * 0.76
      + INFLATION_TARGET * 0.24
      + Math.max(0, macroState.outputGap) * 0.18
      + Math.min(0, macroState.outputGap) * 0.1
      + Math.max(0, currentStats.gasPrice - 3.45) * 0.12
      - Math.max(0, (currentStats.tradeBalance || -67.4) + 67.4) * 0.002
      + macroState.impulses.price * 0.52
      + inflationNoise,
    0.5,
    8
  );

  const unemploymentNoise = ((randoms.unemployment ?? Math.random()) - 0.5) * 0.02;
  const nextUnemployment = clamp(
    unemployment
      + (NATURAL_UNEMPLOYMENT - unemployment) * 0.018
      - priorOutputGap * 0.07
      - (macroState.realGdpGrowth - TREND_GDP_GROWTH) * 0.018
      + macroState.impulses.labor * 0.22
      + unemploymentNoise,
    2.5,
    12
  );

  macroState.potentialRealGdp *= (1 + macroState.potentialGdpGrowth / 100 / 52);
  macroState.realGdp *= (1 + macroState.realGdpGrowth / 100 / 52);
  macroState.priceLevel *= (1 + nextInflation / 100 / 52);
  macroState.housingStartsLag = macroState.housingStarts;
  macroState.housingStarts = Math.round(nextHousingStarts);
  macroState.housingStartsMomentum = nextHousingMomentum;
  macroState.lastUnemployment = unemployment;

  if (week % FED_MEETING_INTERVAL_WEEKS === 0 && !macroState.fedVacant) {
    const fedUpdate = nextFedDecision(macroState, nextInflation, macroState.outputGap);
    macroState.fedFundsRate = fedUpdate.fedFundsRate;
    macroState.fedDecisionSummary = fedUpdate.fedDecisionSummary;
    macroState.lastFedDecisionWeek = week;
  }

  macroState.taxRevenue = fiscal.taxRevenue;
  macroState.impulses = applyImpulseDecay(macroState.impulses);

  return {
    macroState,
    derived: {
      inflation: nextInflation,
      unemployment: nextUnemployment,
    },
  };
}

export function buildFedNominationEvent(nameRegistry) {
  const [first, second, third] = nameRegistry.drawNames(3, "Fed Chair");
  const chairNames = [
    first,
    second,
    third,
  ];
  return {
    id: `fed_nomination_${Date.now()}`,
    name: "Federal Reserve Chair Vacancy",
    desc: "The Federal Reserve Chair has resigned. Markets want clarity on the next governor's approach to inflation and employment.",
    effects: {},
    choices: [
      { text: `Nominate ${chairNames[0]} as a hawkish governor`, fedGovernorChoice: "HAWKISH", fedGovernorName: chairNames[0] },
      { text: `Nominate ${chairNames[1]} as a neutral governor`, fedGovernorChoice: "NEUTRAL", fedGovernorName: chairNames[1] },
      { text: `Nominate ${chairNames[2]} as a dovish governor`, fedGovernorChoice: "DOVISH", fedGovernorName: chairNames[2] },
    ],
  };
}

function buildFedNominationReactions(playerParty, personality) {
  const base = playerParty === "DEM"
    ? { prog: -0.15, mod_dem: 0.1, blue_dog: 0.2, freedom: 0.3, mod_rep: 0.2, trad_con: 0.15 }
    : { prog: -0.1, mod_dem: 0.05, blue_dog: 0.15, freedom: 0.25, mod_rep: 0.25, trad_con: 0.2 };

  if (personality === "HAWKISH") {
    return { ...base, prog: base.prog - 0.15, mod_dem: base.mod_dem - 0.05, freedom: base.freedom + 0.15, trad_con: base.trad_con + 0.2 };
  }
  if (personality === "DOVISH") {
    return { ...base, prog: base.prog + 0.25, mod_dem: base.mod_dem + 0.15, freedom: base.freedom - 0.25, trad_con: base.trad_con - 0.2, mod_rep: base.mod_rep - 0.1 };
  }
  return base;
}

export function resolveFedNomination(congress, playerParty, personality) {
  const reactions = buildFedNominationReactions(playerParty, personality);
  const factions = Object.values(congress.factions || {});
  let senateYes = 0;
  const totalSenate = factions.reduce((sum, faction) => sum + (faction.senateSeats || 0), 0);

  factions.forEach(faction => {
    const reaction = clamp(reactions[faction.id] ?? -0.15, -1, 1);
    const rel = (faction.relationship || 50) / 100;
    const trust = (faction.trust || 50) / 100;
    const support = (reaction + 1) / 2 + (rel - 0.5) * 0.18 + (trust - 0.5) * 0.08;
    const supportShare = clamp(support, 0, 1);
    senateYes += Math.round((faction.senateSeats || 0) * supportShare);
  });

  return {
    passed: senateYes >= 51,
    senateYes,
    totalSenate,
    reactions,
  };
}

export function computeBudgetProjection(stats, macroState, budgetDraft) {
  const nextStats = { ...stats };
  Object.entries(budgetDraft || {}).forEach(([key, delta]) => {
    if (nextStats[key] != null) nextStats[key] = stats[key] * (1 + delta);
  });
  const fiscal = computeFiscalState(nextStats, macroState);
  return {
    stats: nextStats,
    taxRevenue: fiscal.taxRevenue,
    nationalDeficit: fiscal.nationalDeficit,
    totalSpending: fiscal.totalSpending,
  };
}
