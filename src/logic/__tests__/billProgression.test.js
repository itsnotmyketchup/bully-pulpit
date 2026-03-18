import { describe, expect, it, vi } from "vitest";

import { calcStageAdvance } from "../billProgression.js";

const bill = {
  factionReactions: {
    prog: 1,
    freedom: -1,
  },
};

const congress = {
  factions: {
    prog: {
      id: "prog",
      name: "Progressive Caucus",
      relationship: 50,
      trust: 50,
      unity: 100,
      senateSeats: 55,
      houseSeats: 240,
    },
    freedom: {
      id: "freedom",
      name: "Freedom Caucus",
      relationship: 50,
      trust: 50,
      unity: 100,
      senateSeats: 45,
      houseSeats: 195,
    },
  },
};

describe("calcStageAdvance", () => {
  it("requires a Senate supermajority for normal chamber votes", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = calcStageAdvance(bill, congress, "first_chamber", null, false);

    expect(result.votes.senateYes).toBe(55);
    expect(result.votes.houseYes).toBe(240);
    expect(result.advance).toBe(false);
    expect(result.senateThreshold).toBe(0.6);
  });

  it("uses a simple majority for reconciliation votes", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = calcStageAdvance(bill, congress, "reconciliation", null, true);

    expect(result.advance).toBe(true);
    expect(result.senateThreshold).toBe(0.5);
  });

  it("reports a bounded pass likelihood", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = calcStageAdvance(bill, congress, "committee", null, false);

    expect(result.passLikelihood).toBeGreaterThanOrEqual(0);
    expect(result.passLikelihood).toBeLessThanOrEqual(100);
  });
});
