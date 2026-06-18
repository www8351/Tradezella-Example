import { describe, it, expect } from "vitest";

import { contractMultiplier, futuresRoot, futuresContract } from "./contracts";

describe("contractMultiplier (CFD/forex)", () => {
  it("resolves majors, metals, and suffixed symbols", () => {
    expect(contractMultiplier("EURUSD")).toBe(100_000);
    expect(contractMultiplier("XAUUSD")).toBe(100);
    expect(contractMultiplier("EURUSD.r")).toBe(100_000);
    expect(contractMultiplier("XAUUSDm")).toBe(100);
  });

  it("falls back to 1 for unknown symbols", () => {
    expect(contractMultiplier("WONKYPAIR")).toBe(1);
  });
});

describe("futuresRoot", () => {
  it("strips trailing month + year codes", () => {
    expect(futuresRoot("ESZ5")).toBe("ES");
    expect(futuresRoot("MNQH26")).toBe("MNQ");
    expect(futuresRoot("6EU5")).toBe("6E");
    expect(futuresRoot("CLF6")).toBe("CL");
  });

  it("returns the symbol unchanged when there is no contract code", () => {
    expect(futuresRoot("ES")).toBe("ES");
    expect(futuresRoot("MNQ")).toBe("MNQ");
  });
});

describe("futuresContract", () => {
  it("returns point value, tick size, and multiplier for known roots", () => {
    expect(futuresContract("ESZ5")).toEqual({
      multiplier: 50,
      tickSize: 0.25,
      pointValue: 50,
    });
    expect(futuresContract("CLF6").multiplier).toBe(1_000);
    expect(futuresContract("GCZ5").pointValue).toBe(100);
  });

  it("defaults unknown futures to multiplier 1 with null specs", () => {
    expect(futuresContract("ZZZ9")).toEqual({
      multiplier: 1,
      tickSize: null,
      pointValue: null,
    });
  });
});
