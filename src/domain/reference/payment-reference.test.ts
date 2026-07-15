import { describe, it, expect } from "vitest";
import { PaymentReference } from "./payment-reference.js";
import { ValidationError } from "../../errors/validation-error.js";

describe("PaymentReference", () => {
  it("accepts alphanumeric references", () => {
    expect(PaymentReference("abc123XY")).toBe("abc123XY");
  });

  it("accepts hyphens and underscores", () => {
    expect(PaymentReference("order-001_abc")).toBe("order-001_abc");
  });

  it("accepts dots, equals, commas, and plus signs", () => {
    expect(PaymentReference("order.123=AB,CD")).toBe("order.123=AB,CD");
    expect(PaymentReference("ref+case")).toBe("ref+case");
  });

  it("rejects empty string", () => {
    expect(() => PaymentReference("")).toThrow(ValidationError);
  });

  it("rejects if too short", () => {
    expect(() => PaymentReference("abc")).toThrow(ValidationError);
  });

  it("rejects spaces", () => {
    expect(() => PaymentReference("order 123")).toThrow(ValidationError);
  });
});
