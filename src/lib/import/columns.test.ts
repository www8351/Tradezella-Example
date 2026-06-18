import { describe, it, expect } from "vitest";

import { parseNumber, parseDateToIso, parseCsv } from "./columns";

describe("parseNumber", () => {
  it("parses plain and formatted numbers", () => {
    expect(parseNumber("1234")).toBe(1234);
    expect(parseNumber("1,234")).toBe(1234);
    expect(parseNumber("$1,234.56")).toBe(1234.56);
    expect(parseNumber("-5")).toBe(-5);
    expect(parseNumber("1.5e3")).toBe(1500);
    expect(parseNumber("0")).toBe(0);
  });

  it("handles accounting negatives even with a trailing suffix", () => {
    expect(parseNumber("(1,234)")).toBe(-1234);
    expect(parseNumber("(50.00) USD")).toBe(-50);
    expect(parseNumber("(1,234) USD")).toBe(-1234);
  });

  it("returns null for non-numeric / empty residue (not 0)", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("(")).toBeNull();
    expect(parseNumber("USD")).toBeNull();
    expect(parseNumber("N/A")).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
  });
});

describe("parseDateToIso", () => {
  it("treats naked timestamps as UTC (deployment-independent)", () => {
    expect(parseDateToIso("2026-06-18T10:00:00Z")).toBe("2026-06-18T10:00:00.000Z");
    expect(parseDateToIso("2026.06.18 10:30:00")).toBe("2026-06-18T10:30:00.000Z");
    expect(parseDateToIso("2026-06-18 10:30:00")).toBe("2026-06-18T10:30:00.000Z");
    expect(parseDateToIso("2026-06-18T10:30:00")).toBe("2026-06-18T10:30:00.000Z");
  });

  it("parses MetaTrader date-only and epoch values", () => {
    expect(parseDateToIso("2026.06.18")).toBe("2026-06-18T00:00:00.000Z");
    expect(parseDateToIso("1781776800")).toBe(new Date(1781776800 * 1000).toISOString());
  });

  it("returns null for unparseable input", () => {
    expect(parseDateToIso("not a date")).toBeNull();
    expect(parseDateToIso("")).toBeNull();
  });
});

describe("parseCsv line numbers", () => {
  it("reports true physical line numbers across blank lines", () => {
    const csv = ["a,b", "1,2", "", "3,4"].join("\n");
    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].line).toBe(2);
    expect(rows[1].line).toBe(4); // not 3 — the blank line is counted
  });
});
