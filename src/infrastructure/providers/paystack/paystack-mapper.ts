import type { Payment } from "../../../domain/payment/payment.js";
import type { PaymentRequest } from "../../../domain/payment/payment-request.js";
import type { PaymentAttempt } from "../../../domain/payment/payment-attempt.js";
import type { Customer } from "../../../domain/customer/customer.js";
import type { PaymentStatus } from "../../../domain/payment/payment-status.js";
import { Provider } from "../../../domain/provider/provider.js";
import type { Metadata } from "../../../domain/metadata/metadata.js";
import { Money } from "../../../domain/money/money.js";
import { PaymentReference } from "../../../domain/reference/payment-reference.js";
import { ValidationError } from "../../../errors/validation-error.js";
import { ProviderError } from "../../../errors/provider-error.js";
import type {
  PaystackTransactionData,
  PaystackCustomer,
  PaystackAuthorization,
  PaystackInitializeResponse,
  PaystackVerifyResponse,
  PaystackListResponse,
  PaystackWebhookEvent,
  PaystackRefundResponse,
} from "./paystack-types.js";
import type { WebhookEvent } from "../../../domain/webhook/webhook-event.js";
import type { Refund } from "../../../domain/refund/refund.js";
import type { RefundStatus } from "../../../domain/refund/refund-status.js";
import type { Page, RefundResult } from "../../../application/ports/payment-provider.js";

function mapPaystackStatus(status: string, tx: PaystackTransactionData): PaymentStatus {
  switch (status) {
    case "abandoned":
      return { kind: "abandoned" };
    case "success":
      return {
        kind: "success",
        paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(0),
      };
    case "failed":
      return {
        kind: "failed",
        reason: tx.gateway_response ?? "payment_failed",
        failedAt: new Date(tx.updated_at),
      };
    case "pending":
    case "processing":
    case "ongoing":
    case "queued":
      return { kind: "pending" };
    case "reversed":
      return {
        kind: "refunded",
        refundedAt: new Date(tx.updated_at),
        refundId: "unknown",
      };
    default:
      return { kind: "pending" };
  }
}

function emptyMetadata(): Metadata {
  return Object.freeze({}) as Metadata;
}

export function mapPaystackCustomer(pc: PaystackCustomer): Customer {
  const name = [pc.first_name, pc.last_name].filter(Boolean).join(" ") || undefined;
  return {
    id: String(pc.id),
    email: pc.email,
    phone: pc.phone,
    name,
    metadata: pc.metadata ? Object.freeze({ ...pc.metadata }) : emptyMetadata(),
  };
}

function mapAuthorization(auth: PaystackAuthorization, tx: PaystackTransactionData): PaymentAttempt {
  const at = tx.paid_at ?? tx.updated_at ?? tx.created_at;
  return {
    id: auth.authorization_code,
    status: { kind: "success", paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(0) },
    channel: auth.channel as PaymentAttempt["channel"],
    bin: auth.bin,
    last4: auth.last4,
    bank: auth.bank,
    authorizationCode: auth.authorization_code,
    attemptedAt: new Date(at),
  };
}

export function mapPaystackTransactionToPayment(tx: PaystackTransactionData): Payment {
  const provider = Provider("paystack");
  const amount = Money({ amount: tx.amount, currency: tx.currency });
  const status = mapPaystackStatus(tx.status, tx);
  const customer = mapPaystackCustomer(tx.customer);
  const reference = PaymentReference(tx.reference);

  const attempts: PaymentAttempt[] = [];
  if (tx.authorization) {
    attempts.push(mapAuthorization(tx.authorization, tx));
  }

  return {
    id: String(tx.id),
    providerId: provider,
    reference,
    amount,
    fees: tx.fees != null
      ? Money({ amount: tx.fees, currency: tx.currency })
      : undefined,
    netAmount: tx.fees != null
      ? Money({ amount: tx.amount - tx.fees, currency: tx.currency })
      : undefined,
    status,
    customer,
    authorizationUrl: undefined,
    accessCode: undefined,
    channel: tx.channel as Payment["channel"],
    attempts: Object.freeze(attempts),
    metadata: tx.metadata ? Object.freeze({ ...tx.metadata }) : emptyMetadata(),
    createdAt: new Date(tx.created_at),
    updatedAt: new Date(tx.updated_at),
    paidAt: tx.paid_at ? new Date(tx.paid_at) : undefined,
    failureReason: tx.status === "failed" ? tx.gateway_response : undefined,
  };
}

export function mapInitializeResponse(
  response: PaystackInitializeResponse,
  request: PaymentRequest,
): Payment {
  if (!response.status) {
    throw new ProviderError(response.message, {
      provider: Provider("paystack"),
      httpStatus: 422,
      isRetryable: false,
    });
  }

  const data = response.data;
  const reference = request.reference;
  const amount = request.amount;

  return {
    providerId: Provider("paystack"),
    reference,
    amount,
    status: { kind: "initialized" },
    customer: request.customer.kind === "inline"
      ? request.customer.customer
      : {
          id: "pending",
          email: request.customer.kind === "new" ? request.customer.email : "unknown",
          phone: request.customer.kind === "new" ? request.customer.phone : undefined,
          name: request.customer.kind === "new" ? request.customer.name : undefined,
        },
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
    channel: undefined,
    attempts: Object.freeze([]),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : emptyMetadata(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function mapPaystackResponseToPayment(
  response: PaystackVerifyResponse,
): Payment {
  if (!response.status) {
    throw new ValidationError(`Paystack verification failed: ${response.message}`);
  }
  return mapPaystackTransactionToPayment(response.data);
}

export function mapPaystackListResponse(
  response: PaystackListResponse,
): Page<Payment> {
  if (!response.status) {
    throw new ProviderError(response.message, {
      provider: Provider("paystack"),
      httpStatus: 422,
      isRetryable: false,
    });
  }
  return {
    items: response.data.map(mapPaystackTransactionToPayment),
    total: response.meta.total,
    page: response.meta.page,
    perPage: response.meta.perPage,
  };
}

export function mapPaystackWebhookEvent(
  webhook: PaystackWebhookEvent,
): WebhookEvent {
  const tx = webhook.data;
  return {
    id: String(tx.id) || webhook.event,
    provider: Provider("paystack"),
    type: normalizeWebhookType(webhook.event),
    originalType: webhook.event,
    createdAt: new Date(tx.created_at ?? new Date()),
    receivedAt: new Date(),
    payload: tx as unknown as Readonly<Record<string, unknown>>,
    raw: webhook as unknown as Readonly<Record<string, unknown>>,
  };
}

function normalizeWebhookType(event: string): string {
  switch (event) {
    case "charge.success":
      return "payment.succeeded";
    case "charge.failed":
    case "charge.timeout":
      return "payment.failed";
    case "charge.pending":
    case "charge.ongoing":
      return "payment.pending";
    case "charge.created":
      return "payment.initialized";
    case "refund.processed":
      return "refund.succeeded";
    case "refund.failed":
      return "refund.failed";
    case "refund.pending":
      return "refund.initiated";
    case "transfer.success":
      return "transfer.succeeded";
    case "transfer.failed":
      return "transfer.failed";
    case "transfer.reversed":
      return "transfer.reversed";
    default:
      return "payment.unknown";
  }
}

export function mapPaystackRefundResponse(
  response: PaystackRefundResponse,
): RefundResult {
  if (!response.status) {
    throw new ProviderError(response.message, {
      provider: Provider("paystack"),
      httpStatus: 422,
      isRetryable: false,
    });
  }

  const data = response.data;
  return {
    id: String(data.id),
    paymentId: String(data.transaction.id),
    amount: Money({ amount: data.amount, currency: data.currency }),
    status: mapRefundStatus(data.status),
    reason: data.merchant_note,
    reference: String(data.id),
    createdAt: new Date(data.createdAt),
    completedAt: data.status === "processed" ? new Date(data.updatedAt) : undefined,
  };
}

function mapRefundStatus(status: string): RefundResult["status"] {
  switch (status) {
    case "processed":
    case "success":
      return "succeeded";
    case "pending":
    case "processing":
      return "pending";
    case "failed":
      return "failed";
    default:
      return "processing";
  }
}

export function mapRefundResultToRefund(
  result: RefundResult,
  providerId: Provider,
  clock: { now(): Date },
): Refund {
  const status = mapDomainRefundStatus(result.status, result.completedAt, clock);
  return {
    id: result.id,
    paymentId: result.paymentId,
    providerId,
    amount: result.amount,
    reason: result.reason,
    status,
    initiatedAt: result.createdAt,
    completedAt: result.completedAt,
    failureReason: result.status === "failed" ? result.reason : undefined,
    metadata: Object.freeze({}) as Metadata,
  };
}

function mapDomainRefundStatus(
  status: string,
  completedAt: Date | undefined,
  clock: { now(): Date },
): RefundStatus {
  switch (status) {
    case "succeeded":
      return { kind: "succeeded", settledAt: completedAt ?? clock.now() };
    case "failed":
      return { kind: "failed", reason: "refund_failed", failedAt: completedAt ?? clock.now() };
    case "pending":
    case "processing":
    default:
      return { kind: "processing" };
  }
}
