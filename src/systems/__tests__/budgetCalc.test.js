import { describe, expect, it } from "vitest";

import { computeBudgetReactions } from "../budgetCalc.js";

describe("computeBudgetReactions", () => {
  it("makes conservatives less supportive of higher corporate taxes", () => {
    const result = computeBudgetReactions({ corporateTaxRate: 5 });

    expect(result.freedom).toBeLessThan(0);
    expect(result.mod_rep).toBeLessThan(0);
    expect(result.prog).toBeGreaterThan(0);
  });

  it("makes progressives more supportive of broader healthcare coverage", () => {
    const result = computeBudgetReactions({ medicareEligibilityAge: 64, healthcareSubsidyLevel: 1 });

    expect(result.prog).toBeGreaterThan(0);
    expect(result.mod_dem).toBeGreaterThan(0);
    expect(result.freedom).toBeLessThan(0);
  });

  it("makes conservatives less supportive of higher IRS funding", () => {
    const result = computeBudgetReactions({ irsFunding: 0.2 });

    expect(result.freedom).toBeLessThan(0);
    expect(result.mod_rep).toBeLessThan(0);
    expect(result.prog).toBeGreaterThan(0);
  });

  it("clamps reactions to the supported range", () => {
    const result = computeBudgetReactions({
      corporateTaxRate: 10,
      medicareEligibilityAge: 50,
      childTaxCredit: 10000,
      militarySpending: 10,
    });

    Object.values(result).forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    });
  });
});
