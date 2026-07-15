import { ValidationError } from "../../errors/validation-error.js";

export type Provider = "paystack" | (string & {});

const PROVIDER_RE = /^[a-z][a-z0-9_]*$/;

export function Provider(value: string): Provider {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError("Provider must be a non-empty string");
  }
  if (!PROVIDER_RE.test(value)) {
    throw new ValidationError(
      `Invalid provider name "${value}": must start with a lowercase letter and contain only lowercase letters, digits, and underscores`,
    );
  }
  return value as Provider;
}
