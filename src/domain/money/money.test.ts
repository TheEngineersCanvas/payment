import { describe, it, expect } from "vitest";
import { MinorUnits, Money } from "./money.js";

describe("MinorUnits", () => {
  it("creates valid minor units", () => {
    expect(MinorUnits(0)).toBe(0);
    expect(MinorUnits(100)).toBe(100);
    expect(MinorUnits(50000)).toBe(50000);
  });

  it("rejects negative values", () => {
    expect(() => MinorUnits(-1)).toThrow("Amount must not be negative");
  });

  it("rejects non-integer values", () => {
    expect(() => MinorUnits(1.5)).toThrow("Amount must be an integer");
    expect(() => MinorUnits(NaN)).toThrow("Amount must be a finite number");
    expect(() => MinorUnits(Infinity)).toThrow("Amount must be a finite number");
  });
});

describe("Money", () => {
  it("constructs a Money value object", () => {
    const m = Money({ amount: 50000, currency: "NGN" });
    expect(m.amount).toBe(50000);
    expect(m.currency).toBe("NGN");
  });
});
