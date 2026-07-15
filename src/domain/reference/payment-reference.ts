import { ValidationError } from "../../errors/validation-error.js";

declare const PaymentReferenceSymbol: unique symbol;

export type PaymentReference = string & { readonly [PaymentReferenceSymbol]: true };

export function PaymentReference(raw: string): PaymentReference {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new ValidationError("Payment reference must be a non-empty string");
  }
  if (!/^[A-Za-z0-9._=,+\-]{6,100}$/.test(raw)) {
    throw new ValidationError(
      `Payment reference must be 6-100 characters, containing only alphanumeric characters, hyphens, underscores, dots, equals, commas, and plus signs (got length ${raw.length})`,
    );
  }
  return raw as PaymentReference;
}
