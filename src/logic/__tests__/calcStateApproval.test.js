import { describe, expect, it } from "vitest";

import { calcStateApproval } from "../calcStateApproval.js";

const baseState = {
  abbr: "OH",
  lean: 0.5,
  economy: "manufacturing",
  urbanization: 0.55,
};

function makeStats(overrides = {}) {
  return {
    approvalRating: 50,
    gasPrice: 3.5,
    unemployment: 4.5,
    gdpGrowth: 2.5,
    inflation: 2.5,
    crimeRate: 4.8,
    nationalDeficit: 1800,
    ...overrides,
  };
}

describe("calcStateApproval", () => {
  it("lowers approval when unemployment rises in manufacturing states", () => {
    const lowUnemployment = calcStateApproval(baseState, makeStats({ unemployment: 4.5 }), "DEM", {});
    const highUnemployment = calcStateApproval(baseState, makeStats({ unemployment: 7 }), "DEM", {});

    expect(highUnemployment).toBeLessThan(lowUnemployment);
  });

  it("applies state-specific bonuses from visits and events", () => {
    const withoutBonus = calcStateApproval(baseState, makeStats(), "DEM", {});
    const withBonus = calcStateApproval(baseState, makeStats(), "DEM", { OH: 0.03 });

    expect(withBonus).toBeGreaterThan(withoutBonus);
  });

  it("keeps approval within the configured bounds", () => {
    const cappedLow = calcStateApproval(
      { ...baseState, economy: "tourism", urbanization: 0.9 },
      makeStats({ approvalRating: 5, gasPrice: 8, unemployment: 10, inflation: 8, crimeRate: 10, nationalDeficit: 4000 }),
      "DEM",
      {}
    );
    const cappedHigh = calcStateApproval(
      { ...baseState, economy: "tech" },
      makeStats({ approvalRating: 95, gdpGrowth: 8 }),
      "REP",
      { OH: 1 }
    );

    expect(cappedLow).toBeGreaterThanOrEqual(12);
    expect(cappedHigh).toBeLessThanOrEqual(88);
  });
});
