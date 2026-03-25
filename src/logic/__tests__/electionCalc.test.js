import { describe, expect, it, vi } from "vitest";

import {
  applyElectionSeats,
  computeEnthusiasms,
  computePollingProjection,
  computeSeatChanges,
} from "../electionCalc.js";

const congress = {
  pp: "DEM",
  factions: {
    prog: {
      id: "prog",
      name: "Progressive Caucus",
      party: "DEM",
      relationship: 80,
      unity: 78,
      trust: 70,
      senateSeats: 24,
      houseSeats: 110,
      leader: { charisma: 7 },
    },
    mod_dem: {
      id: "mod_dem",
      name: "New Democrats",
      party: "DEM",
      relationship: 72,
      unity: 74,
      trust: 65,
      senateSeats: 18,
      houseSeats: 95,
      leader: { charisma: 6 },
    },
    blue_dog: {
      id: "blue_dog",
      name: "Blue Dog Coalition",
      party: "DEM",
      relationship: 65,
      unity: 68,
      trust: 62,
      senateSeats: 9,
      houseSeats: 30,
      leader: { charisma: 5 },
    },
    freedom: {
      id: "freedom",
      name: "Freedom Caucus",
      party: "REP",
      relationship: 25,
      unity: 80,
      trust: 40,
      senateSeats: 20,
      houseSeats: 90,
      leader: { charisma: 5 },
    },
    mod_rep: {
      id: "mod_rep",
      name: "Main Street Republicans",
      party: "REP",
      relationship: 35,
      unity: 72,
      trust: 45,
      senateSeats: 16,
      houseSeats: 75,
      leader: { charisma: 6 },
    },
    trad_con: {
      id: "trad_con",
      name: "Traditional Conservatives",
      party: "REP",
      relationship: 30,
      unity: 76,
      trust: 42,
      senateSeats: 13,
      houseSeats: 35,
      leader: { charisma: 5 },
    },
  },
};

describe("computeEnthusiasms", () => {
  it("rewards fulfilled promises and allied legislation", () => {
    const low = computeEnthusiasms(
      congress,
      "DEM",
      52,
      20,
      {},
      [],
      6
    );
    const high = computeEnthusiasms(
      congress,
      "DEM",
      52,
      20,
      { infra_boost: 10, abortion_rights: 14 },
      [{ billId: "infra_boost" }],
      6
    );

    expect(high.partyEnthusiasm).toBeGreaterThan(low.partyEnthusiasm);
  });

  it("raises opposition enthusiasm when executive overreach is high", () => {
    const lowOverreach = computeEnthusiasms(congress, "DEM", 52, 10, {}, [], 6);
    const highOverreach = computeEnthusiasms(congress, "DEM", 52, 80, {}, [], 6);

    expect(highOverreach.oppEnthusiasm).toBeGreaterThan(lowOverreach.oppEnthusiasm);
  });

  it("only removes the activity penalty at roughly one campaign action per week", () => {
    const underTarget = computeEnthusiasms(congress, "DEM", 52, 20, {}, [], 15);
    const atTarget = computeEnthusiasms(congress, "DEM", 52, 20, {}, [], 16);

    expect(atTarget.partyEnthusiasm).toBeGreaterThan(underTarget.partyEnthusiasm);
  });
});

describe("computeSeatChanges", () => {
  it("produces better seat results for stronger approval and enthusiasm", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const weak = computeSeatChanges(congress, "DEM", 44, 35, 70, false, 1);
    const strong = computeSeatChanges(congress, "DEM", 58, 75, 40, false, 6);

    expect(strong.houseNetChange).toBeGreaterThan(weak.houseNetChange);
    expect(strong.senateNetChange).toBeGreaterThanOrEqual(weak.senateNetChange);
  });

  it("returns faction deltas that can be applied back to valid chamber totals", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const changes = computeSeatChanges(congress, "DEM", 56, 70, 45, true, 6);
    const updated = applyElectionSeats(congress.factions, changes.factionHouseChanges, changes.factionSenateChanges);

    const houseTotal = Object.values(updated).reduce((sum, faction) => sum + faction.houseSeats, 0);
    const senateTotal = Object.values(updated).reduce((sum, faction) => sum + faction.senateSeats, 0);

    expect(houseTotal).toBe(435);
    expect(senateTotal).toBe(100);
  });
});

describe("computePollingProjection", () => {
  it("penalizes low campaign activity", () => {
    const idle = computePollingProjection(65, 45, 54, 0, false, 0);
    const active = computePollingProjection(65, 45, 54, 0, false, 6);

    expect(active.projectedHouseChange).toBeGreaterThan(idle.projectedHouseChange);
  });

  it("returns human-readable advice", () => {
    const projection = computePollingProjection(40, 70, 44, 0, false, 1);

    expect(typeof projection.advice).toBe("string");
    expect(projection.advice.length).toBeGreaterThan(10);
  });

  it("only removes the seat penalty at sixteen campaign actions or more", () => {
    const nearFull = computePollingProjection(65, 45, 54, 0, false, 15);
    const full = computePollingProjection(65, 45, 54, 0, false, 16);

    expect(full.projectedHouseChange).toBeGreaterThan(nearFull.projectedHouseChange);
  });
});
