import { ValidationError } from "../../errors/validation-error.js";

declare const PaymentReferenceSymbol: unique symbol;

export type PaymentReference = string & { readonly [PaymentReferenceSymbol]: true };

export function PaymentReference(raw: string): PaymentReference {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new ValidationError("Payment reference must be a non-empty string");
  }
  if (raw.length < 6 || raw.length > 100) {
    throw new ValidationError(
      `Payment reference must be between 6 and 100 characters, got ${raw.length}`,
    );
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(raw)) {
    throw new ValidationError(
      "Payment reference must contain only alphanumeric characters, hyphens, and underscores",
    );
  }
  return raw as PaymentReference;
}
