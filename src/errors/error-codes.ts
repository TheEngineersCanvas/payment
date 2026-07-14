export const ErrorCode = {
  CONFIGURATION: "CONFIGURATION",
  VALIDATION: "VALIDATION",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  NETWORK: "NETWORK",
  TIMEOUT: "TIMEOUT",
  WEBHOOK_VALIDATION: "WEBHOOK_VALIDATION",
  VERIFICATION: "VERIFICATION",
  REFUND: "REFUND",
  PROVIDER: "PROVIDER",
  PROVIDER_BAD_REQUEST: "PROVIDER_BAD_REQUEST",
  PROVIDER_UNAUTHORIZED: "PROVIDER_UNAUTHORIZED",
  PROVIDER_NOT_FOUND: "PROVIDER_NOT_FOUND",
  PROVIDER_CONFLICT: "PROVIDER_CONFLICT",
  PROVIDER_RATE_LIMIT: "PROVIDER_RATE_LIMIT",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ErrorCategory = {
  CONFIGURATION: "configuration",
  VALIDATION: "validation",
  PROVIDER: "provider",
  NETWORK: "network",
  TIMEOUT: "timeout",
  WEBHOOK: "webhook",
  REFUND: "refund",
  VERIFICATION: "verification",
  INTERNAL: "internal",
} as const;

export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory];
