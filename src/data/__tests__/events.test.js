import { describe, expect, it } from "vitest";

import { generateDynamicEvents } from "../events.js";
import { INITIAL_STATS } from "../stats.js";

describe("generateDynamicEvents", () => {
  it("returns playable events with basic required fields", () => {
    const stateApproval = {
      CA: 52,
      TX: 48,
      NY: 54,
      FL: 49,
      OH: 50,
    };

    const events = generateDynamicEvents(
      { ...INITIAL_STATS },
      stateApproval,
      new Set(),
      "DEM",
      1,
      {},
      20,
      []
    );

    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);

    events.forEach((event) => {
      expect(event.id).toBeTruthy();
      expect(event.name).toBeTruthy();
      expect(event.desc).toBeTruthy();
      expect(Array.isArray(event.choices)).toBe(true);
      expect(event.choices.length).toBeGreaterThan(0);
      event.choices.forEach((choice) => {
        expect(choice.text).toBeTruthy();
      });
    });
  });
});
