import { describe, expect, it, vi } from "vitest";

import { buildYearlyPromiseOffers } from "../promiseOffers.js";

describe("buildYearlyPromiseOffers", () => {
  it("offers a cabinet promise when State is vacant", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    const offers = buildYearlyPromiseOffers({
      playerParty: "DEM",
      usedPol: new Set(),
      billCooldowns: {},
      week: 1,
      cabinetState: {
        secState: {
          occupantName: null,
        },
      },
      pendingAppointment: null,
    });

    expect(offers.prog.some((offer) => offer.type === "cabinet")).toBe(true);

    randomSpy.mockRestore();
  });

  it("suppresses the cabinet offer while a State nomination is pending", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    const offers = buildYearlyPromiseOffers({
      playerParty: "DEM",
      usedPol: new Set(),
      billCooldowns: {},
      week: 1,
      cabinetState: {
        secState: {
          occupantName: null,
        },
      },
      pendingAppointment: { officeId: "sec_state" },
    });

    expect(offers.prog.some((offer) => offer.type === "cabinet")).toBe(false);

    randomSpy.mockRestore();
  });
});
