import { describe, it, expect } from "vitest";
import {
  mapPaystackTransactionToPayment,
  mapInitializeResponse,
  mapPaystackListResponse,
  mapPaystackWebhookEvent,
  mapPaystackRefundResponse,
  mapPaystackCustomer,
} from "./paystack-mapper.js";
import { Money } from "../../../domain/money/money.js";
import { PaymentReference } from "../../../domain/reference/payment-reference.js";
import { ProviderError } from "../../../errors/provider-error.js";
import type {
  PaystackTransactionData,
  PaystackInitializeResponse,
  PaystackListResponse,
  PaystackWebhookEvent,
  PaystackRefundResponse,
} from "./paystack-types.js";
import type { PaymentRequest } from "../../../domain/payment/payment-request.js";

const SAMPLE_TX: PaystackTransactionData = {
  id: 12345,
  domain: "test",
  status: "success",
  reference: "order-001",
  amount: 5000000,
  currency: "NGN",
  channel: "card",
  gateway_response: "Successful",
  metadata: { custom_field: "value" },
  paid_at: "2026-07-14T10:30:00.000Z",
  created_at: "2026-07-14T10:29:00.000Z",
  updated_at: "2026-07-14T10:30:00.000Z",
  authorization: {
    authorization_code: "AUTH_123",
    bin: "408408",
    last4: "4081",
    bank: "Test Bank",
    channel: "card",
    country_code: "NG",
    brand: "visa",
  },
  customer: {
    id: 100,
    email: "test@example.com",
    phone: "+2348000000000",
    first_name: "John",
    last_name: "Doe",
    customer_code: "CUS_123",
  },
  log: { start_time: 1000, time_spent: 5, attempts: 1, errors: 0 },
  fees: 75000,
  fees_split: null,
};

describe("mapPaystackTransactionToPayment", () => {
  it("maps a successful transaction", () => {
    const payment = mapPaystackTransactionToPayment(SAMPLE_TX);

    expect(payment.id).toBe("12345");
    expect(payment.providerId).toBe("paystack");
    expect(payment.reference).toBe("order-001");
    expect(payment.amount.amount).toBe(5000000);
    expect(payment.amount.currency).toBe("NGN");
    expect(payment.status.kind).toBe("success");
    expect(payment.customer.email).toBe("test@example.com");
    expect(payment.customer.name).toBe("John Doe");
    expect(payment.attempts).toHaveLength(1);
    expect(payment.attempts[0]?.authorizationCode).toBe("AUTH_123");
    expect(payment.channel).toBe("card");
  });

  it("maps an abandoned transaction", () => {
    const abandoned = { ...SAMPLE_TX, status: "abandoned", paid_at: null, authorization: null };
    const payment = mapPaystackTransactionToPayment(abandoned);

    expect(payment.status.kind).toBe("abandoned");
    expect(payment.attempts).toHaveLength(0);
    expect(payment.paidAt).toBeUndefined();
  });

  it("maps a failed transaction", () => {
    const failed = { ...SAMPLE_TX, status: "failed", gateway_response: "Insufficient funds", authorization: null };
    const payment = mapPaystackTransactionToPayment(failed);

    expect(payment.status.kind).toBe("failed");
    expect(payment.failureReason).toBe("Insufficient funds");
  });
});

describe("mapPaystackCustomer", () => {
  it("combines first_name and last_name", () => {
    const customer = mapPaystackCustomer(SAMPLE_TX.customer);
    expect(customer.name).toBe("John Doe");
  });

  it("handles missing last_name", () => {
    const customer = mapPaystackCustomer({ ...SAMPLE_TX.customer, last_name: null as unknown as undefined });
    expect(customer.name).toBe("John");
  });
});

describe("mapInitializeResponse", () => {
  it("maps an initialize response to Payment", () => {
    const response: PaystackInitializeResponse = {
      status: true,
      message: "Authorization URL created",
      data: {
        authorization_url: "https://checkout.paystack.com/test",
        access_code: "ACC_123",
        reference: "order-001",
      },
    };

    const request: PaymentRequest = {
      amount: Money({ amount: 5000, currency: "NGN" }),
      reference: PaymentReference("order-001"),
      customer: { kind: "new", email: "test@example.com", name: "John" },
    };

    const payment = mapInitializeResponse(response, request);

    expect(payment.status.kind).toBe("initialized");
    expect(payment.authorizationUrl).toBe("https://checkout.paystack.com/test");
    expect(payment.amount.amount).toBe(5000);
    expect(payment.customer.email).toBe("test@example.com");
    expect(payment.id).toBeUndefined();
    expect(payment.reference).toBe("order-001");
  });
});

describe("mapPaystackListResponse", () => {
  it("maps a list response", () => {
    const response: PaystackListResponse = {
      status: true,
      message: "Transactions retrieved",
      data: [SAMPLE_TX],
      meta: { total: 1, skipped: 0, perPage: 50, page: 1, pageCount: 1 },
    };

    const page = mapPaystackListResponse(response);
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(1);
    expect(page.page).toBe(1);
    expect(page.perPage).toBe(50);
  });
});

describe("mapPaystackWebhookEvent", () => {
  it("maps charge.success to payment.succeeded", () => {
    const webhook: PaystackWebhookEvent = {
      event: "charge.success",
      data: SAMPLE_TX,
    };

    const event = mapPaystackWebhookEvent(webhook);
    expect(event.type).toBe("payment.succeeded");
    expect(event.originalType).toBe("charge.success");
    expect(event.provider).toBe("paystack");
  });

  it("maps charge.failed to payment.failed", () => {
    const webhook: PaystackWebhookEvent = {
      event: "charge.failed",
      data: { ...SAMPLE_TX, status: "failed" },
    };

    const event = mapPaystackWebhookEvent(webhook);
    expect(event.type).toBe("payment.failed");
  });
});

describe("mapPaystackRefundResponse", () => {
  it("maps a refund response", () => {
    const response: PaystackRefundResponse = {
      status: true,
      message: "Refund processed",
      data: {
        id: 500,
        transaction: SAMPLE_TX,
        amount: 5000000,
        currency: "NGN",
        status: "processed",
        merchant_note: "Customer request",
        customer_note: "Refund",
        createdAt: "2026-07-15T00:00:00.000Z",
        updatedAt: "2026-07-15T00:01:00.000Z",
      },
    };

    const refund = mapPaystackRefundResponse(response);
    expect(refund.status).toBe("succeeded");
    expect(refund.paymentId).toBe("12345");
    expect(refund.amount.amount).toBe(5000000);
    expect(refund.reason).toBe("Customer request");
  });
});

describe("Paystack business error guards", () => {
  it("mapInitializeResponse throws ProviderError when status is false", () => {
    const response: PaystackInitializeResponse = {
      status: false,
      message: "Duplicate transaction reference",
      data: null as unknown as PaystackInitializeResponse["data"],
    };

    const request = {
      amount: Money({ amount: 5000, currency: "NGN" }),
      reference: PaymentReference("order-001"),
      customer: { kind: "new", email: "test@example.com" } as const,
    };

    expect(() => mapInitializeResponse(response, request)).toThrow(ProviderError);
    expect(() => mapInitializeResponse(response, request)).toThrow("Duplicate transaction reference");
  });

  it("mapPaystackListResponse throws ProviderError when status is false", () => {
    const response: PaystackListResponse = {
      status: false,
      message: "Invalid query parameter",
      data: null as unknown as PaystackListResponse["data"],
      meta: null as unknown as PaystackListResponse["meta"],
    };

    expect(() => mapPaystackListResponse(response)).toThrow(ProviderError);
    expect(() => mapPaystackListResponse(response)).toThrow("Invalid query parameter");
  });

  it("mapPaystackRefundResponse throws ProviderError when status is false", () => {
    const response: PaystackRefundResponse = {
      status: false,
      message: "Duplicate refund reference",
      data: null as unknown as PaystackRefundResponse["data"],
    };

    expect(() => mapPaystackRefundResponse(response)).toThrow(ProviderError);
    expect(() => mapPaystackRefundResponse(response)).toThrow("Duplicate refund reference");
  });
});

describe("Timestamp accuracy", () => {
  it("Payment status.paidAt uses the real Paystack paid_at timestamp", () => {
    const payment = mapPaystackTransactionToPayment(SAMPLE_TX);

    expect(payment.status.kind).toBe("success");
    if (payment.status.kind === "success") {
      expect(payment.status.paidAt.toISOString()).toBe("2026-07-14T10:30:00.000Z");
    }
    expect(payment.paidAt?.toISOString()).toBe("2026-07-14T10:30:00.000Z");
  });

  it("PaymentAttempt.attemptedAt uses tx.paid_at when available", () => {
    const payment = mapPaystackTransactionToPayment(SAMPLE_TX);

    expect(payment.attempts[0]?.attemptedAt.toISOString()).toBe("2026-07-14T10:30:00.000Z");
  });

  it("Payment status.failedAt uses updated_at for failed transactions", () => {
    const failed = { ...SAMPLE_TX, status: "failed", gateway_response: "Declined", paid_at: null };
    const payment = mapPaystackTransactionToPayment(failed);

    expect(payment.status.kind).toBe("failed");
    if (payment.status.kind === "failed") {
      expect(payment.status.failedAt.toISOString()).toBe("2026-07-14T10:30:00.000Z");
    }
  });

  it("PaymentAttempt.attemptedAt falls back to updated_at when paid_at is null", () => {
    const tx = { ...SAMPLE_TX, paid_at: null };
    const payment = mapPaystackTransactionToPayment(tx);

    expect(payment.attempts[0]?.attemptedAt.toISOString()).toBe("2026-07-14T10:30:00.000Z");
  });
});

describe("mapInitializeResponse", () => {
  it("does not set id on initialized payments", () => {
    const response: PaystackInitializeResponse = {
      status: true,
      message: "Authorization URL created",
      data: {
        authorization_url: "https://checkout.paystack.com/test",
        access_code: "ACC_123",
        reference: "order-001",
      },
    };

    const request = {
      amount: Money({ amount: 5000, currency: "NGN" }),
      reference: PaymentReference("order-001"),
      customer: { kind: "new", email: "test@example.com" } as const,
    };

    const payment = mapInitializeResponse(response, request);
    expect(payment.id).toBeUndefined();
    expect(payment.reference).toBe("order-001");
  });
});
