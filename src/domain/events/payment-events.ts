import type { PaymentInitialized } from "./payment-initialized.js";
import type { PaymentPending } from "./payment-pending.js";
import type { PaymentSucceeded } from "./payment-succeeded.js";
import type { PaymentFailed } from "./payment-failed.js";
import type { VerificationCompleted } from "./verification-completed.js";
import type { WebhookReceived } from "./webhook-received.js";

export type {
  PaymentInitialized,
  PaymentPending,
  PaymentSucceeded,
  PaymentFailed,
  VerificationCompleted,
  WebhookReceived,
};

export type PaymentEvent =
  | PaymentInitialized
  | PaymentPending
  | PaymentSucceeded
  | PaymentFailed
  | VerificationCompleted
  | WebhookReceived
  | { readonly type: string; readonly occurredAt: Date; readonly correlationId: string };

export type PaymentEventType = PaymentEvent["type"];
