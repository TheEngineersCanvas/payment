export type Provider = "paystack" | (string & {});

export function Provider(value: string): Provider {
  if (!value || typeof value !== "string") {
    throw new Error("Provider must be a non-empty string");
  }
  return value as Provider;
}
