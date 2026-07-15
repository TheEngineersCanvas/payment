import { Currency } from "./currency.js";
import { ValidationError } from "../../errors/validation-error.js";

declare const MinorUnitsSymbol: unique symbol;

export type MinorUnits = number & { readonly [MinorUnitsSymbol]: true };

export function MinorUnits(value: number): MinorUnits {
  if (!Number.isFinite(value)) {
    throw new ValidationError("Amount must be a finite number");
  }
  if (!Number.isInteger(value)) {
    throw new ValidationError("Amount must be an integer (minor units)");
  }
  if (value < 0) {
    throw new ValidationError("Amount must not be negative");
  }
  if (value > Number.MAX_SAFE_INTEGER) {
    throw new ValidationError("Amount exceeds maximum safe integer");
  }
  return value as MinorUnits;
}

export interface Money {
  readonly amount: MinorUnits;
  readonly currency: Currency;
}

export function Money(input: { amount: number; currency: string }): Money {
  return {
    amount: MinorUnits(input.amount),
    currency: Currency(input.currency),
  };
}
