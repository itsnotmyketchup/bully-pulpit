import { describe, expect, it } from "vitest";

import {
  INITIAL_MACRO_STATE,
  INFLATION_TARGET,
  NATURAL_UNEMPLOYMENT,
  advanceMacroEconomy,
  adaptLegacyEffectsToMacroImpulses,
  computeBudgetProjection,
  computeFiscalState,
  createInitialMacroState,
  deriveVisibleStats,
  resolveFedNomination,
} from "../macroEconomy.js";

function makeStats(overrides = {}) {
  return {
    gdpGrowth: 2.2,
    realGdpGrowth: 2.2,
    potentialGdpGrowth: 2.1,
    outputGap: 0,
    nominalGdp: 28.0,
    unemployment: NATURAL_UNEMPLOYMENT,
    inflation: 2.9,
    nationalDebt: 36.2,
    nationalDeficit: 1820,
    taxRevenue: 6326,
    fedFundsRate: 4.5,
    housingStarts: 1366900,
    approvalRating: 54,
    population: 345426571,
    birthRate: 10.8,
    deathRate: 9.2,
    crimeRate: 4.8,
    gasPrice: 3.45,
    immigrationRate: 1.1,
    tradeBalance: -67.4,
    militarySpending: 886,
    educationSpending: 102,
    healthcareSpending: 1520,
    socialSecuritySpending: 1490,
    infrastructureSpending: 110,
    otherSpending: 169,
    scienceTechnologySpending: 45,
    lawEnforcementSpending: 58,
    agricultureSpending: 31,
    energyEnvironmentSpending: 35,
    irsFunding: 14,
    powerHydroShare: 6,
    powerSolarShare: 7,
    powerWindShare: 10,
    powerCoalShare: 15,
    powerNuclearShare: 18,
    powerNaturalGasShare: 44,
    evShareNewCars: 18,
    carbonEmissionsPerCapita: 13.8,
    cleanVehicleTaxCreditCost: 0,
    evAdoptionIncentive: 0,
    medicareEligibilityAge: 65,
    drugPriceNegotiationLevel: 1,
    healthcareSubsidyLevel: 0,
    corporateTaxRate: 21,
    incomeTaxLow: 10,
    incomeTaxMid: 22,
    incomeTaxHigh: 37,
    payrollTaxRate: 7.65,
    childTaxCredit: 2000,
    earnedIncomeTaxCredit: 7830,
    saltDeductionCap: 10000,
    firstTimeHomebuyerTaxCredit: 0,
    evTaxCredit: 7500,
    renewableInvestmentTaxCredit: 30,
    ...overrides,
  };
}

describe("computeFiscalState", () => {
  it("raises revenue when nominal GDP rises", () => {
    const base = computeFiscalState(makeStats(), createInitialMacroState());
    const richerMacro = {
      ...createInitialMacroState(),
      realGdp: INITIAL_MACRO_STATE.realGdp * 1.12,
    };
    const richer = computeFiscalState(makeStats(), richerMacro);

    expect(richer.taxRevenue).toBeGreaterThan(base.taxRevenue);
  });

  it("lowers revenue when unemployment rises", () => {
    const employed = computeFiscalState(makeStats({ unemployment: 4.2 }), createInitialMacroState());
    const slack = computeFiscalState(makeStats({ unemployment: 7.1 }), createInitialMacroState());

    expect(slack.taxRevenue).toBeLessThan(employed.taxRevenue);
  });

  it("reduces net tax revenue when EV tax credits are larger", () => {
    const base = computeFiscalState(makeStats({ evTaxCredit: 7500, cleanVehicleTaxCreditCost: 0 }), createInitialMacroState());
    const credited = computeFiscalState(makeStats({ evTaxCredit: 10000, cleanVehicleTaxCreditCost: 0 }), createInitialMacroState());

    expect(credited.taxRevenue).toBeLessThan(base.taxRevenue);
    expect(credited.nationalDeficit).toBeGreaterThan(base.nationalDeficit);
  });

  it("raises revenue when IRS funding improves compliance", () => {
    const lowerFunding = computeFiscalState(makeStats({ irsFunding: 10 }), createInitialMacroState());
    const higherFunding = computeFiscalState(makeStats({ irsFunding: 18 }), createInitialMacroState());

    expect(higherFunding.taxRevenue).toBeGreaterThan(lowerFunding.taxRevenue);
    expect(higherFunding.nationalDeficit).toBeLessThan(lowerFunding.nationalDeficit);
  });
});

describe("advanceMacroEconomy", () => {
  it("moves inflation up when output gap is positive", () => {
    const hotMacro = {
      ...createInitialMacroState(),
      outputGap: 2.2,
      realGdpGrowth: 3.8,
      consumerConfidence: 60,
      businessConfidence: 60,
    };
    const coolMacro = {
      ...createInitialMacroState(),
      outputGap: -1.8,
      realGdpGrowth: 1.2,
      consumerConfidence: 44,
      businessConfidence: 44,
    };

    const hot = advanceMacroEconomy(hotMacro, makeStats({ inflation: INFLATION_TARGET }), 5, { growth: 0.5, inflation: 0.5, unemployment: 0.5 });
    const cool = advanceMacroEconomy(coolMacro, makeStats({ inflation: INFLATION_TARGET }), 5, { growth: 0.5, inflation: 0.5, unemployment: 0.5 });

    expect(hot.derived.inflation).toBeGreaterThan(cool.derived.inflation);
  });

  it("improves structural technology slowly when science funding is higher", () => {
    const startMacro = createInitialMacroState();
    const highScience = advanceMacroEconomy(startMacro, makeStats({ scienceTechnologySpending: 90 }), 5, { growth: 0.5, inflation: 0.5, unemployment: 0.5 });
    const lowScience = advanceMacroEconomy(startMacro, makeStats({ scienceTechnologySpending: 20 }), 5, { growth: 0.5, inflation: 0.5, unemployment: 0.5 });

    expect(highScience.macroState.technologicalAdvancement).toBeGreaterThan(lowScience.macroState.technologicalAdvancement);
    expect(highScience.macroState.technologicalAdvancement - startMacro.technologicalAdvancement).toBeLessThan(0.5);
  });

  it("reduces housing starts when rates and unemployment are high", () => {
    const soft = advanceMacroEconomy(
      { ...createInitialMacroState(), fedFundsRate: 3.5, consumerConfidence: 56 },
      makeStats({ unemployment: 4.2, inflation: 2.4 }),
      5,
      { growth: 0.5, inflation: 0.5, unemployment: 0.5, housing: 0.5 }
    );
    const tight = advanceMacroEconomy(
      { ...createInitialMacroState(), fedFundsRate: 6.1, consumerConfidence: 46 },
      makeStats({ unemployment: 6.4, inflation: 3.8 }),
      5,
      { growth: 0.5, inflation: 0.5, unemployment: 0.5, housing: 0.5 }
    );

    expect(tight.macroState.housingStarts).toBeLessThan(soft.macroState.housingStarts);
  });

  it("adjusts Fed rates at meeting intervals", () => {
    const hotMacro = {
      ...createInitialMacroState(),
      outputGap: 2.4,
      fedFundsRate: 3.5,
      governorPersonality: "HAWKISH",
    };
    const result = advanceMacroEconomy(hotMacro, makeStats({ inflation: 4.1 }), 12, { growth: 0.5, inflation: 0.5, unemployment: 0.5 });

    expect(result.macroState.fedFundsRate).toBeGreaterThanOrEqual(3.5);
    expect(result.macroState.fedDecisionSummary).toContain("inflation");
  });
});

describe("legacy adapters", () => {
  it("converts science spending and growth effects into macro impulses", () => {
    const result = adaptLegacyEffectsToMacroImpulses(
      createInitialMacroState(),
      { gdpGrowth: 0.2, scienceTechnologySpending: 15 },
      { id: "nasa_auth", category: "science & tech", name: "NASA Authorization Act" }
    );

    expect(result.impulses.technology).toBeGreaterThan(0);
    expect(result.impulses.investment).toBeGreaterThan(0);
  });

  it("keeps derived visible stats in sync with macro state", () => {
    const macroState = {
      ...createInitialMacroState(),
      realGdpGrowth: 3.1,
      potentialGdpGrowth: 2.4,
      outputGap: 0.8,
      fedFundsRate: 5.1,
      priceLevel: 104,
      realGdp: 29,
    };
    const derived = deriveVisibleStats(makeStats({ unemployment: 4.1, inflation: 2.7 }), macroState);

    expect(derived.gdpGrowth).toBe(3.1);
    expect(derived.fedFundsRate).toBe(5.1);
    expect(derived.nominalGdp).toBeCloseTo(30.16, 2);
    expect(derived.housingStarts).toBe(Math.round(macroState.housingStarts));
  });
});

describe("budget projection and Fed nominations", () => {
  it("projects a changed deficit from draft taxes and spending", () => {
    const projection = computeBudgetProjection(
      makeStats(),
      createInitialMacroState(),
      { incomeTaxMid: 5, infrastructureSpending: 0.1, childTaxCredit: 3000, irsFunding: 0.1 }
    );

    expect(projection.nationalDeficit).not.toBe(makeStats().nationalDeficit);
  });

  it("uses Senate seats when resolving Fed nominations", () => {
    const congress = {
      factions: {
        prog: { id: "prog", senateSeats: 20, relationship: 55, trust: 55 },
        mod_dem: { id: "mod_dem", senateSeats: 18, relationship: 60, trust: 58 },
        blue_dog: { id: "blue_dog", senateSeats: 14, relationship: 58, trust: 54 },
        freedom: { id: "freedom", senateSeats: 16, relationship: 40, trust: 40 },
        mod_rep: { id: "mod_rep", senateSeats: 18, relationship: 44, trust: 44 },
        trad_con: { id: "trad_con", senateSeats: 14, relationship: 42, trust: 42 },
      },
    };

    const moderate = resolveFedNomination(congress, "DEM", "NEUTRAL");
    expect(moderate.totalSenate).toBe(100);
    expect(typeof moderate.passed).toBe("boolean");
  });
});
