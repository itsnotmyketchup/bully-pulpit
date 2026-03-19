import { afterEach, describe, expect, it, vi } from "vitest";

import { generateCongress } from "../generateCongress.js";

function makeNameRegistry() {
  let counter = 0;
  return {
    drawName(role) {
      counter += 1;
      return `${role} ${counter}`;
    },
  };
}

function getPartyTotals(factions, party) {
  return Object.values(factions)
    .filter(faction => faction.party === party)
    .reduce((totals, faction) => ({
      senate: totals.senate + (faction.senateSeats || 0),
      house: totals.house + (faction.houseSeats || 0),
    }), { senate: 0, house: 0 });
}

describe("generateCongress difficulty presets", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the normal preset by default", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const congress = generateCongress("DEM", "prog", makeNameRegistry());
    const totals = getPartyTotals(congress.factions, "DEM");

    expect(totals.senate).toBe(52);
    expect(totals.house).toBe(222);
  });

  it("gives the player a supermajority on easy", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const congress = generateCongress("DEM", "prog", makeNameRegistry(), "easy");
    const totals = getPartyTotals(congress.factions, "DEM");

    expect(totals.senate).toBeGreaterThanOrEqual(60);
    expect(totals.senate).toBeLessThanOrEqual(65);
    expect(totals.house).toBeGreaterThan(289);
  });

  it("puts the player in the minority on hard and very hard", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const hardCongress = generateCongress("DEM", "prog", makeNameRegistry(), "hard");
    const veryHardCongress = generateCongress("DEM", "prog", makeNameRegistry(), "very_hard");
    const hardTotals = getPartyTotals(hardCongress.factions, "DEM");
    const veryHardTotals = getPartyTotals(veryHardCongress.factions, "DEM");

    expect(hardTotals.senate).toBeLessThan(50);
    expect(hardTotals.house).toBeLessThan(218);
    expect(veryHardTotals.senate).toBeLessThanOrEqual(40);
    expect(veryHardTotals.house).toBeLessThan(218);
  });
});
