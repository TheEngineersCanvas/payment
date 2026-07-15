import { ValidationError } from "../../errors/validation-error.js";

export type Currency =
  | "NGN"
  | "GHS"
  | "ZAR"
  | "KES"
  | "USD"
  | "EUR"
  | "GBP"
  | (string & {});

const ISO_4217_RE = /^[A-Z]{3}$/;

export function Currency(value: string): Currency {
  if (typeof value !== "string" || !ISO_4217_RE.test(value)) {
    throw new ValidationError(`Invalid currency code "${value}": must be a 3-letter ISO 4217 code`);
  }
  return value as Currency;
}
