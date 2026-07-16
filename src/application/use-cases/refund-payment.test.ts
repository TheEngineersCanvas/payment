import { describe, it, expect, vi } from "vitest";
import type { PaymentProvider, RefundResult } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import { Money } from "../../domain/money/money.js";
import { Provider } from "../../domain/provider/provider.js";
import { refundPayment, type RefundPaymentDeps, type RefundPaymentInput } from "../use-cases/refund-payment.js";
import type { PaymentError } from "../../errors/payment-error.js";
import type { Result } from "../../shared/result/result.js";

type RefundMockResult = Result<RefundResult, PaymentError>;

function makeDeps(overrides?: Partial<RefundPaymentDeps>): RefundPaymentDeps {
  return {
    provider: {
      id: Provider("paystack"),
      capabilities: {} as PaymentProvider["capabilities"],
      initialize: vi.fn(),
      verify: vi.fn(),
      fetch: vi.fn(),
      list: vi.fn(),
      refund: vi.fn(),
      parseWebhook: vi.fn(),
      health: vi.fn(),
    },
    eventBus: { emit: vi.fn(), on: vi.fn(), onAny: vi.fn() },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      child: () => overrides?.logger ?? fakeLogger,
    },
    clock: { now: () => new Date("2026-07-15T12:00:00Z") },
    idGenerator: { generate: () => "test-correlation-id" },
    ...overrides,
  };
}

const fakeLogger: Logger = {
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  child: vi.fn(),
};

describe("refundPayment", () => {
  const baseInput: RefundPaymentInput = {
    paymentId: "123",
    reason: "customer_request",
    amount: Money({ amount: 5000, currency: "NGN" }),
  };

  it("returns a Refund on success (pending)", async () => {
    const deps = makeDeps();
    vi.mocked(deps.provider.refund).mockResolvedValue({
      ok: true,
      value: {
        id: "ref-001",
        paymentId: "123",
        amount: Money({ amount: 5000, currency: "NGN" }),
        status: "pending",
        reason: "customer_request",
        reference: "corr-xyz",
        createdAt: new Date(),
      },
    } as RefundMockResult);

    const result = await refundPayment(deps, baseInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe("ref-001");
      expect(result.value.status.kind).toBe("processing");
    }
    expect(deps.eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "refund.initiated" }),
    );
  });

  it("returns a Refund on synchronous success", async () => {
    const deps = makeDeps();
    vi.mocked(deps.provider.refund).mockResolvedValue({
      ok: true,
      value: {
        id: "ref-002",
        paymentId: "123",
        amount: Money({ amount: 5000, currency: "NGN" }),
        status: "succeeded",
        reason: "customer_request",
        reference: "corr-xyz",
        createdAt: new Date(),
        completedAt: new Date(),
      },
    } as RefundMockResult);

    const result = await refundPayment(deps, baseInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status.kind).toBe("succeeded");
    }
    expect(deps.eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "refund.succeeded" }),
    );
  });

  it("returns error on provider failure", async () => {
    const deps = makeDeps();
    vi.mocked(deps.provider.refund).mockResolvedValue({
      ok: false,
      error: { code: "REFUND", message: "Refund failed", category: "refund", httpStatus: 400, isRetryable: false, correlationId: "c1" } as PaymentError,
    } as never);

    const result = await refundPayment(deps, baseInput);
    expect(result.ok).toBe(false);
    expect(deps.eventBus.emit).not.toHaveBeenCalled();
  });

  it("returns ValidationError for zero amount", async () => {
    const deps = makeDeps();
    const input = { ...baseInput, amount: Money({ amount: 0, currency: "NGN" }) };
    const result = await refundPayment(deps, input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION");
    }
  });

  it("handles partial refund amount", async () => {
    const deps = makeDeps();
    vi.mocked(deps.provider.refund).mockResolvedValue({
      ok: true,
      value: {
        id: "ref-003",
        paymentId: "123",
        amount: Money({ amount: 1000, currency: "NGN" }),
        status: "processing",
        reason: "partial",
        reference: "corr-xyz",
        createdAt: new Date(),
      },
    } as RefundMockResult);

    const result = await refundPayment(deps, {
      paymentId: "123",
      reason: "partial",
      amount: Money({ amount: 1000, currency: "NGN" }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount.amount).toBe(1000);
    }
  });
});
