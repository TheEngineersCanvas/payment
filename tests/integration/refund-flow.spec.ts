import { describe, it, expect, beforeAll } from "vitest";
import { createPaymentClient } from "../../src/public-api/client.js";
import { PaymentReference } from "../../src/domain/reference/payment-reference.js";
import { Money } from "../../src/domain/money/money.js";
import type { PaymentClient } from "../../src/application/payment-client.js";

const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const describeIf = SECRET_KEY ? describe : describe.skip;

describeIf("Paystack Sandbox — Refunds", () => {
  let client: PaymentClient;

  beforeAll(() => {
    client = createPaymentClient({
      providers: {
        paystack: { secretKey: SECRET_KEY! },
      },
      defaultProvider: "paystack",
    });
  });

  it("initializes, verifies, and refunds a payment", { timeout: 30_000 }, async () => {
    const ref = PaymentReference(`e2e-refund-${Date.now()}`);

    const initResult = await client.payments.initialize({
      amount: Money({ amount: 100000, currency: "NGN" }),
      reference: ref,
      customer: { kind: "new", email: "test@tec-test.com" },
    });

    if (!initResult.ok) {
      console.error("Initialize error:", initResult.error.message);
    }
    expect(initResult.ok).toBe(true);
    if (!initResult.ok) return;

    const verifyResult = await client.payments.verify(ref);
    expect(verifyResult.ok).toBe(true);
    if (!verifyResult.ok) return;

    const paymentId = verifyResult.value.id;
    expect(paymentId).toBeDefined();

    const refundResult = await client.refunds.create({
      paymentId,
      amount: Money({ amount: 100, currency: "NGN" }),
      reason: "e2e test refund",
    });

    expect(refundResult.ok).toBe(true);
    if (refundResult.ok) {
      expect(refundResult.value.id).toBeDefined();
      expect(refundResult.value.paymentId).toBe(paymentId);
      expect(["pending", "processing", "succeeded"]).toContain(refundResult.value.status.kind);
    } else {
      console.error("Refund error:", refundResult.error.message, refundResult.error.code);
    }
  });
});
