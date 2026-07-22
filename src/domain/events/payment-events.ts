import type { PaymentInitialized } from "./payment-initialized.js";
import type { PaymentPending } from "./payment-pending.js";
import type { PaymentSucceeded } from "./payment-succeeded.js";
import type { PaymentFailed } from "./payment-failed.js";
import type { VerificationCompleted } from "./verification-completed.js";
import type { WebhookReceived } from "./webhook-received.js";
import type { RefundInitiated } from "./refund-initiated.js";
import type { RefundSucceeded } from "./refund-succeeded.js";
import type { RefundFailed } from "./refund-failed.js";
import type { TransferInitiated } from "./transfer-initiated.js";
import type { TransferSucceeded } from "./transfer-succeeded.js";
import type { TransferFailed } from "./transfer-failed.js";
import type { TransferReversed } from "./transfer-reversed.js";

export type {
  PaymentInitialized,
  PaymentPending,
  PaymentSucceeded,
  PaymentFailed,
  VerificationCompleted,
  WebhookReceived,
  RefundInitiated,
  RefundSucceeded,
  RefundFailed,
  TransferInitiated,
  TransferSucceeded,
  TransferFailed,
  TransferReversed,
};

export type PaymentEvent =
  | PaymentInitialized
  | PaymentPending
  | PaymentSucceeded
  | PaymentFailed
  | VerificationCompleted
  | WebhookReceived
  | RefundInitiated
  | RefundSucceeded
  | RefundFailed
  | TransferInitiated
  | TransferSucceeded
  | TransferFailed
  | TransferReversed
  | { readonly type: string; readonly occurredAt: Date; readonly correlationId: string };

export type PaymentEventType = PaymentEvent["type"];
