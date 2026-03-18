import { describe, expect, it } from "vitest";

import { computeBudgetReactions } from "../budgetCalc.js";

describe("computeBudgetReactions", () => {
  it("makes conservatives less supportive of higher corporate taxes", () => {
    const result = computeBudgetReactions({ corporateTaxRate: 0.1 });

    expect(result.freedom).toBeLessThan(0);
    expect(result.mod_rep).toBeLessThan(0);
    expect(result.prog).toBeGreaterThan(0);
  });

  it("makes progressives more supportive of healthcare spending increases", () => {
    const result = computeBudgetReactions({ healthcareSpending: 0.2 });

    expect(result.prog).toBeGreaterThan(0);
    expect(result.mod_dem).toBeGreaterThan(0);
    expect(result.freedom).toBeLessThan(0);
  });

  it("clamps reactions to the supported range", () => {
    const result = computeBudgetReactions({
      corporateTaxRate: 10,
      healthcareSpending: 10,
      militarySpending: 10,
    });

    Object.values(result).forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    });
  });
});
