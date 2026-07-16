import { describe, it, expect, beforeAll } from "vitest";
import { createPaymentClient } from "../../src/public-api/client.js";
import { PaymentReference } from "../../src/domain/reference/payment-reference.js";
import { Money } from "../../src/domain/money/money.js";
import type { PaymentRequest } from "../../src/domain/payment/payment-request.js";
import type { PaymentClient } from "../../src/application/payment-client.js";

const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const describeIf = SECRET_KEY ? describe : describe.skip;

describeIf("Paystack Sandbox Integration", () => {
  let client: PaymentClient;

  beforeAll(() => {
    client = createPaymentClient({
      providers: {
        paystack: { secretKey: SECRET_KEY! },
      },
      defaultProvider: "paystack",
    });
  });

  it("initializes a payment and returns authorization URL", { timeout: 15_000 }, async () => {
    const ref = PaymentReference(`e2e-init-${Date.now()}`);
    const req: PaymentRequest = {
      amount: Money({ amount: 500000, currency: "NGN" }),
      reference: ref,
      customer: { kind: "new", email: "test@tec-test.com" },
      callbackUrl: "https://example.com/callback",
    };

    const result = await client.payments.initialize(req);

    if (!result.ok) {
      console.error("Initialize error:", result.error.message, result.error.code);
    }

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status.kind).toBe("initialized");
      expect(result.value.authorizationUrl).toBeDefined();
      expect(result.value.authorizationUrl).toMatch(/^https:\/\/checkout\.paystack\.com\//);
      expect(result.value.reference).toBe(ref);
    }
  });

  it("verifies a payment that was just initialized (still pending)", { timeout: 15_000 }, async () => {
    const ref = PaymentReference(`e2e-verify-${Date.now()}`);
    const initResult = await client.payments.initialize({
      amount: Money({ amount: 100000, currency: "NGN" }),
      reference: ref,
      customer: { kind: "new", email: "test@tec-test.com" },
    });

    if (!initResult.ok) {
      console.error("Initialize error:", initResult.error.message, initResult.error.code);
    }

    expect(initResult.ok).toBe(true);
    if (!initResult.ok) return;

    const verifyResult = await client.payments.verify(ref);

    expect(verifyResult.ok).toBe(true);
    if (verifyResult.ok) {
      expect(verifyResult.value.reference).toBe(ref);
    } else {
      console.error("Verify error:", verifyResult.error.message, verifyResult.error.code);
    }
  });

  it("fetches a payment by id", { timeout: 15_000 }, async () => {
    const ref = PaymentReference(`e2e-fetch-${Date.now()}`);
    const initResult = await client.payments.initialize({
      amount: Money({ amount: 200000, currency: "NGN" }),
      reference: ref,
      customer: { kind: "new", email: "test@tec-test.com" },
    });

    if (!initResult.ok) {
      console.error("Initialize error:", initResult.error.message, initResult.error.code);
      return;
    }

    const verifyResult = await client.payments.verify(ref);
    expect(verifyResult.ok).toBe(true);
    if (!verifyResult.ok) {
      console.error("Verify error:", verifyResult.error.message, verifyResult.error.code);
      return;
    }

    const fetchResult = await client.payments.fetch(verifyResult.value.id!);

    expect(fetchResult.ok).toBe(true);
    if (fetchResult.ok) {
      expect(fetchResult.value.reference).toBe(ref);
    } else {
      console.error("Fetch error:", fetchResult.error.message, fetchResult.error.code);
    }
  });

  it("lists payments", { timeout: 15_000 }, async () => {
    const result = await client.payments.list({ page: 1, perPage: 5 });

    if (!result.ok) {
      console.error("List error:", result.error.message, result.error.code);
    }

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toBeDefined();
      expect(result.value.total).toBeGreaterThanOrEqual(0);
      expect(result.value.page).toBe(1);
    }
  });

  it("health check returns healthy", { timeout: 15_000 }, async () => {
    const results = await client.health();

    expect(results).toHaveLength(1);
    expect(results[0]!.healthy).toBe(true);
    expect(results[0]!.latencyMs).toBeGreaterThan(0);
  });
});
