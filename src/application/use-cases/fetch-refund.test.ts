import { describe, it, expect, vi } from "vitest";
import type { PaymentProvider, RefundResult } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import { Money } from "../../domain/money/money.js";
import { Provider } from "../../domain/provider/provider.js";
import { fetchRefund, type FetchRefundDeps } from "../use-cases/fetch-refund.js";
import type { PaymentError } from "../../errors/payment-error.js";
import type { Result } from "../../shared/result/result.js";

type FetchRefundMockResult = Result<RefundResult, PaymentError>;

const fakeLogger: Logger = {
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  child: vi.fn(),
};

function makeDeps(overrides?: Partial<FetchRefundDeps>): FetchRefundDeps {
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
      fetchRefund: vi.fn(),
    },
    logger: overrides?.logger ?? fakeLogger,
    clock: { now: () => new Date("2026-07-15T12:00:00Z") },
  };
}

describe("fetchRefund", () => {
  it("returns a Refund when provider supports fetchRefund", async () => {
    const deps = makeDeps();
    vi.mocked(deps.provider.fetchRefund!).mockResolvedValue({
      ok: true,
      value: {
        id: "ref-001",
        paymentId: "123",
        amount: Money({ amount: 5000, currency: "NGN" }),
        status: "succeeded",
        reason: "customer_request",
        reference: "corr-xyz",
        createdAt: new Date("2026-07-15T12:00:00Z"),
        completedAt: new Date("2026-07-15T12:01:00Z"),
      },
    } as FetchRefundMockResult);

    const result = await fetchRefund(deps, "ref-001");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe("ref-001");
      expect(result.value.status.kind).toBe("succeeded");
      expect(result.value.paymentId).toBe("123");
    }
  });

  it("returns error when provider does not support fetchRefund", async () => {
    const deps = makeDeps();
    deps.provider.fetchRefund = undefined;

    const result = await fetchRefund(deps, "ref-001");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("does not support");
    }
  });

  it("returns error on provider failure", async () => {
    const deps = makeDeps();
    vi.mocked(deps.provider.fetchRefund!).mockResolvedValue({
      ok: false,
      error: {
        code: "REFUND",
        message: "Refund not found",
        category: "refund",
        httpStatus: 404,
        isRetryable: false,
        correlationId: "c1",
      } as PaymentError,
    } as never);

    const result = await fetchRefund(deps, "ref-missing");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("Refund not found");
    }
  });
});
