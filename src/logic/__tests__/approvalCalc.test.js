import { describe, expect, it } from "vitest";

import {
  HONEYMOON_START_APPROVAL,
  advanceApproval,
  computeApprovalTarget,
} from "../approvalCalc.js";

function makeStats(overrides = {}) {
  return {
    approvalRating: HONEYMOON_START_APPROVAL,
    gdpGrowth: 2.2,
    unemployment: 4.4,
    inflation: 2.9,
    gasPrice: 3.45,
    crimeRate: 4.8,
    nationalDeficit: 1820,
    ...overrides,
  };
}

describe("computeApprovalTarget", () => {
  it("rewards stronger macro conditions", () => {
    const weak = computeApprovalTarget(
      makeStats({ gdpGrowth: 1.2, unemployment: 6.2, inflation: 4.2, gasPrice: 4.6, crimeRate: 5.6 }),
      "DEM"
    );
    const strong = computeApprovalTarget(
      makeStats({ gdpGrowth: 3.4, unemployment: 3.8, inflation: 2.2, gasPrice: 3.0, crimeRate: 4.4 }),
      "DEM"
    );

    expect(strong).toBeGreaterThan(weak);
  });
});

describe("advanceApproval", () => {
  it("creates a honeymoon decay from 54 toward 40 over six weeks", () => {
    let approval = HONEYMOON_START_APPROVAL;

    for (let week = 2; week <= 7; week += 1) {
      approval = advanceApproval(makeStats({ approvalRating: approval }), "DEM", week, 0.5);
    }

    expect(approval).toBeLessThanOrEqual(41);
    expect(approval).toBeGreaterThanOrEqual(39);
  });

  it("drifts upward after the honeymoon when conditions improve", () => {
    const higher = advanceApproval(
      makeStats({ approvalRating: 40, gdpGrowth: 3.6, unemployment: 3.8, inflation: 2.1, gasPrice: 3.0 }),
      "DEM",
      12,
      0.5
    );

    expect(higher).toBeGreaterThan(40);
  });
});
