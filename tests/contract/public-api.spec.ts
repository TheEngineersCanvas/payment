import { describe, it, expect } from "vitest";

import {
  VERSION,
  createPaymentClient,
  Money,
  MinorUnits,
  PaymentReference,
  Provider,
  ok,
  err,
  attempt,
  PaymentError,
  ConfigurationError,
  ValidationError,
  ProviderError,
  ProviderBadRequestError,
  ProviderUnauthorizedError,
  ProviderNotFoundError,
  ProviderConflictError,
  ProviderRateLimitError,
  ProviderUnavailableError,
  NetworkError,
  TimeoutError,
  WebhookValidationError,
  VerificationError,
  RefundError,
  InternalError,
  ErrorCode,
  ErrorCategory,
  isFinalStatus,
  isTransitionAllowed,
  isFinalRefundStatus,
  RefundReason,
  type Metadata,
  type Result,
  type PaymentErrorOptions,
  type PaymentClient,
  type PaymentClientConfig,
  type Logger,
  type EventBus,
  type EventSubscription,
  type EventHandler,
  type Unsubscribe,
  type Clock,
  type IdGenerator,
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
  type ProviderCapabilities,
  type ListQuery,
  type Page,
  type HealthStatus,
  type RefundRequest,
  type RefundResult,
  type Payment,
  type PaymentStatus,
  type PaymentStatusKind,
  type PaymentRequest,
  type CustomerReference,
  type PaymentChannel,
  type PaymentAttempt,
  type Customer,
  type Refund,
  type RefundStatus,
  type RefundStatusKind,
  type WebhookEvent,
  type PaymentEvent,
  type PaymentEventType,
  type PaymentInitialized,
  type PaymentPending,
  type PaymentSucceeded,
  type PaymentFailed,
  type VerificationCompleted,
  type WebhookReceived,
  type RefundInitiated,
  type RefundSucceeded,
  type RefundFailed,
  type WebhookInput,
  type RefundCreateInput,
  type Transfer,
  type TransferStatus,
  type TransferStatusKind,
  type TransferRecipient,
  type BankCode,
  type ResolveAccountResult,
  type CreateRecipientInput,
  type InitiateTransferInput,
  isFinalTransferStatus,
  type TransferInitiated,
  type TransferSucceeded,
  type TransferFailed,
  type TransferReversed,
} from "../../src/public-api/index.js";

describe("public-api barrel exports", () => {
  it("exports all documented value exports", () => {
    expect(VERSION).toBe("0.1.0-RC4");
    expect(typeof createPaymentClient).toBe("function");
    expect(typeof Money).toBe("function");
    expect(typeof MinorUnits).toBe("function");
    expect(typeof PaymentReference).toBe("function");
    expect(typeof Provider).toBe("function");
    expect(typeof ok).toBe("function");
    expect(typeof err).toBe("function");
    expect(typeof attempt).toBe("function");
    expect(typeof PaymentError).toBe("function");
    expect(typeof ConfigurationError).toBe("function");
    expect(typeof ValidationError).toBe("function");
    expect(typeof ProviderError).toBe("function");
    expect(typeof ProviderBadRequestError).toBe("function");
    expect(typeof ProviderUnauthorizedError).toBe("function");
    expect(typeof ProviderNotFoundError).toBe("function");
    expect(typeof ProviderConflictError).toBe("function");
    expect(typeof ProviderRateLimitError).toBe("function");
    expect(typeof ProviderUnavailableError).toBe("function");
    expect(typeof NetworkError).toBe("function");
    expect(typeof TimeoutError).toBe("function");
    expect(typeof WebhookValidationError).toBe("function");
    expect(typeof VerificationError).toBe("function");
    expect(typeof RefundError).toBe("function");
    expect(typeof InternalError).toBe("function");
    expect(ErrorCode).toBeDefined();
    expect(ErrorCategory).toBeDefined();
    expect(typeof isFinalStatus).toBe("function");
    expect(typeof isTransitionAllowed).toBe("function");
    expect(typeof isFinalRefundStatus).toBe("function");
    expect(typeof isFinalTransferStatus).toBe("function");
    expect(typeof RefundReason).toBe("function");
  });

  it("exports all documented type-only members", () => {
    const types: Record<string, unknown> = {
      Metadata: null as Metadata | null,
      Result: null as Result<unknown, unknown> | null,
      PaymentErrorOptions: null as PaymentErrorOptions | null,
      PaymentClient: null as PaymentClient | null,
      PaymentClientConfig: null as PaymentClientConfig | null,
      Logger: null as Logger | null,
      EventBus: null as EventBus | null,
      EventSubscription: null as EventSubscription | null,
      EventHandler: null as EventHandler | null,
      Unsubscribe: null as Unsubscribe | null,
      Clock: null as Clock | null,
      IdGenerator: null as IdGenerator | null,
      HttpClient: null as HttpClient | null,
      HttpRequest: null as HttpRequest | null,
      HttpResponse: null as HttpResponse | null,
      ProviderCapabilities: null as ProviderCapabilities | null,
      ListQuery: null as ListQuery | null,
      Page: null as Page<unknown> | null,
      HealthStatus: null as HealthStatus | null,
      RefundRequest: null as RefundRequest | null,
      RefundResult: null as RefundResult | null,
      Payment: null as Payment | null,
      PaymentStatus: null as PaymentStatus | null,
      PaymentStatusKind: null as PaymentStatusKind | null,
      PaymentRequest: null as PaymentRequest | null,
      CustomerReference: null as CustomerReference | null,
      PaymentChannel: null as PaymentChannel | null,
      PaymentAttempt: null as PaymentAttempt | null,
      Customer: null as Customer | null,
      Refund: null as Refund | null,
      RefundStatus: null as RefundStatus | null,
      RefundStatusKind: null as RefundStatusKind | null,
      WebhookEvent: null as WebhookEvent | null,
      PaymentEvent: null as PaymentEvent | null,
      PaymentEventType: null as PaymentEventType | null,
      PaymentInitialized: null as PaymentInitialized | null,
      PaymentPending: null as PaymentPending | null,
      PaymentSucceeded: null as PaymentSucceeded | null,
      PaymentFailed: null as PaymentFailed | null,
      VerificationCompleted: null as VerificationCompleted | null,
      WebhookReceived: null as WebhookReceived | null,
      RefundInitiated: null as RefundInitiated | null,
      RefundSucceeded: null as RefundSucceeded | null,
      RefundFailed: null as RefundFailed | null,
      WebhookInput: null as WebhookInput | null,
      RefundCreateInput: null as RefundCreateInput | null,
      Transfer: null as Transfer | null,
      TransferStatus: null as TransferStatus | null,
      TransferStatusKind: null as TransferStatusKind | null,
      TransferRecipient: null as TransferRecipient | null,
      BankCode: null as BankCode | null,
      ResolveAccountResult: null as ResolveAccountResult | null,
      CreateRecipientInput: null as CreateRecipientInput | null,
      InitiateTransferInput: null as InitiateTransferInput | null,
      TransferInitiated: null as TransferInitiated | null,
      TransferSucceeded: null as TransferSucceeded | null,
      TransferFailed: null as TransferFailed | null,
      TransferReversed: null as TransferReversed | null,
    };

    for (const name of Object.keys(types)) {
      expect(types[name as keyof typeof types]).toBeNull();
    }
  });

  it("ProviderRateLimitError instanceof check works", () => {
    const err = new ProviderRateLimitError("test");
    expect(err instanceof ProviderRateLimitError).toBe(true);
    expect(err instanceof ProviderError).toBe(true);
    expect(err.isRetryable).toBe(true);
    expect(err.httpStatus).toBe(429);
  });

  it("Payment.id is optional", () => {
    const payment: Payment = {
      providerId: Provider("paystack"),
      reference: PaymentReference("order-001"),
      amount: Money({ amount: 100, currency: "NGN" }),
      status: { kind: "initialized" },
      customer: { id: "pending", email: "test@test.com" },
      attempts: [],
      metadata: Object.freeze({}),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(payment.id).toBeUndefined();
  });

  it("Payment has fees, netAmount, accessCode", () => {
    const payment: Payment = {
      providerId: Provider("paystack"),
      reference: PaymentReference("order-001"),
      amount: Money({ amount: 500000, currency: "NGN" }),
      fees: Money({ amount: 7500, currency: "NGN" }),
      netAmount: Money({ amount: 492500, currency: "NGN" }),
      accessCode: "ACC_123",
      status: { kind: "success", paidAt: new Date() },
      customer: { id: "cus_1", email: "test@test.com", name: "John" },
      authorizationUrl: "https://checkout.example.com",
      channel: "card",
      attempts: [],
      metadata: Object.freeze({}),
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: new Date(),
    };
    expect(payment.fees?.amount).toBe(7500);
    expect(payment.netAmount?.amount).toBe(492500);
    expect(payment.accessCode).toBe("ACC_123");
  });

  it("PaymentRequest has correlationId", () => {
    const req: PaymentRequest = {
      amount: Money({ amount: 100, currency: "NGN" }),
      customer: { kind: "new", email: "test@test.com" },
      reference: PaymentReference("order-001"),
      correlationId: "corr-xyz",
    };
    expect(req.correlationId).toBe("corr-xyz");
  });

  it("PaymentRequest has idempotencyKey", () => {
    const req: PaymentRequest = {
      amount: Money({ amount: 100, currency: "NGN" }),
      customer: { kind: "new", email: "test@test.com" },
      reference: PaymentReference("order-001"),
      idempotencyKey: "key-123",
    };
    expect(req.idempotencyKey).toBe("key-123");
  });

  it("RefundCreateInput has reference, idempotencyKey, and correlationId", () => {
    const input: RefundCreateInput = {
      paymentId: "12345",
      reason: "test",
      reference: "ref-abc",
      idempotencyKey: "key-456",
      correlationId: "corr-refund",
    };
    expect(input.reference).toBe("ref-abc");
    expect(input.idempotencyKey).toBe("key-456");
    expect(input.correlationId).toBe("corr-refund");
  });

  it("RefundRequest has idempotencyKey and correlationId", () => {
    const req: RefundRequest = {
      paymentId: "123",
      reason: "test",
      reference: "ref-abc",
      idempotencyKey: "key-789",
      correlationId: "corr-rfnd",
    };
    expect(req.idempotencyKey).toBe("key-789");
    expect(req.correlationId).toBe("corr-rfnd");
  });

  it("HttpRequest has correlationId and idempotencyKey", () => {
    const req: HttpRequest = {
      method: "GET",
      url: "https://example.com",
      correlationId: "corr-123",
      idempotencyKey: "key-123",
    };
    expect(req.correlationId).toBe("corr-123");
    expect(req.idempotencyKey).toBe("key-123");
  });

  it("isFinalTransferStatus returns true for final statuses", () => {
    expect(isFinalTransferStatus({ kind: "succeeded", settledAt: new Date() })).toBe(true);
    expect(isFinalTransferStatus({ kind: "failed", reason: "err", failedAt: new Date() })).toBe(true);
    expect(isFinalTransferStatus({ kind: "reversed", reversedAt: new Date() })).toBe(true);
    expect(isFinalTransferStatus({ kind: "pending" })).toBe(false);
    expect(isFinalTransferStatus({ kind: "processing" })).toBe(false);
  });
});
