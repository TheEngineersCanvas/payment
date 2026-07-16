import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac } from "node:crypto";

import { PaystackAdapter } from "../../src/infrastructure/providers/paystack/paystack-adapter.js";
import { Money } from "../../src/domain/money/money.js";
import { PaymentReference } from "../../src/domain/reference/payment-reference.js";
import type { PaymentRequest } from "../../src/domain/payment/payment-request.js";
import type { ProviderConfig } from "../../src/application/ports/provider-factory.js";
import { HmacWebhookVerifier } from "../../src/infrastructure/webhook/hmac-webhook-verifier.js";
import { MockHttpClient } from "../helpers/mock-http-client.js";
import { NoopLogger } from "../../src/infrastructure/logging/noop-logger.js";
import { SystemClock } from "../../src/infrastructure/clock/system-clock.js";
import { UlidIdGenerator } from "../../src/infrastructure/id/ulid-id-generator.js";
import { InMemoryEventBus } from "../../src/infrastructure/event-bus/in-memory-event-bus.js";

const WEBHOOK_SECRET = "whsec_test_123";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): string {
  return readFileSync(join(__dirname, "..", "fixtures", name), "utf-8");
}

function createAdapter(http: MockHttpClient): PaystackAdapter {
  const config: ProviderConfig = {
    secretKey: "sk_test_fake",
    webhookSecret: WEBHOOK_SECRET,
  };

  return new PaystackAdapter(config, {
    httpClient: http,
    logger: new NoopLogger(),
    clock: new SystemClock(),
    eventBus: new InMemoryEventBus(new NoopLogger()),
    idGenerator: new UlidIdGenerator(),
    webhookVerifier: new HmacWebhookVerifier(WEBHOOK_SECRET, "sha512"),
  });
}

function createBaseRequest(overrides?: Partial<PaymentRequest>): PaymentRequest {
  return {
    amount: Money({ amount: 5000000, currency: "NGN" }),
    reference: PaymentReference("order-9001"),
    customer: { kind: "new", email: "test@example.com" },
    ...overrides,
  };
}

describe("Provider contract — Paystack", () => {
  let http: MockHttpClient;
  let adapter: PaystackAdapter;

  beforeEach(() => {
    http = new MockHttpClient();
    adapter = createAdapter(http);
  });

  describe("initialize", () => {
    it("returns a Payment with authorizationUrl", async () => {
      http.setResponse("POST", "https://api.paystack.co/transaction/initialize", {
        status: 200,
        body: loadFixture("paystack-initialize.json"),
      });

      const result = await adapter.initialize(createBaseRequest());

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status.kind).toBe("initialized");
        expect(result.value.authorizationUrl).toBe("https://checkout.paystack.com/0peioxfhpn");
        expect(result.value.reference).toBe("order-9001");
        expect(result.value.amount.amount).toBe(5000000);
        expect(result.value.amount.currency).toBe("NGN");
      }
    });

    it("returns error when provider fails", async () => {
      http.setResponse("POST", "https://api.paystack.co/transaction/initialize", {
        status: 500,
        body: '{"error": "server error"}',
      });

      const result = await adapter.initialize(createBaseRequest());
      expect(result.ok).toBe(false);
    });
  });

  describe("verify", () => {
    it("returns a Payment with success status", async () => {
      http.setResponse("GET", "https://api.paystack.co/transaction/verify/order-9001", {
        status: 200,
        body: loadFixture("paystack-verify.json"),
      });

      const result = await adapter.verify(PaymentReference("order-9001"));

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status.kind).toBe("success");
        expect(result.value.id).toBe("3811142484");
      }
    });
  });

  describe("fetch", () => {
    it("returns a Payment by id", async () => {
      http.setResponse("GET", "https://api.paystack.co/transaction/3811142484", {
        status: 200,
        body: loadFixture("paystack-verify.json"),
      });

      const result = await adapter.fetch("3811142484");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("3811142484");
      }
    });
  });

  describe("list", () => {
    it("returns a paginated list of Payments", async () => {
      http.setResponse("GET", "https://api.paystack.co/transaction", {
        status: 200,
        body: loadFixture("paystack-list.json"),
      });

      const result = await adapter.list({ page: 1, perPage: 50 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.total).toBe(2);
        expect(result.value.page).toBe(1);
        expect(result.value.items[0]?.status.kind).toBe("success");
        expect(result.value.items[1]?.status.kind).toBe("abandoned");
      }
    });
  });

  describe("capabilities", () => {
    it("returns Paystack capabilities", () => {
      expect(adapter.capabilities.supportsAuthorizationUrl).toBe(true);
      expect(adapter.capabilities.supportsWebhooks).toBe(true);
      expect(adapter.capabilities.supportsPartialRefund).toBe(true);
      expect(adapter.capabilities.supportedCurrencies).toContain("NGN");
      expect(adapter.capabilities.supportedChannels).toContain("card");
    });
  });

  describe("health", () => {
    it("returns healthy when reachable", async () => {
      http.setResponse("GET", "https://api.paystack.co/transaction", {
        status: 200,
        body: '{"status":true}',
      });

      const result = await adapter.health();
      expect(result.healthy).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("refund", () => {
    it("returns a RefundResult on success", async () => {
      http.setResponse("POST", "https://api.paystack.co/refund", {
        status: 200,
        body: loadFixture("paystack-refund.json"),
      });

      const result = await adapter.refund({
        paymentId: "3811142484",
        amount: 5000000,
        reason: "Customer request",
        reference: "corr-xyz",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("succeeded");
        expect(result.value.id).toBe("500");
        expect(result.value.paymentId).toBe("3811142484");
      }
    });

    it("returns error when provider fails", async () => {
      http.setResponse("POST", "https://api.paystack.co/refund", {
        status: 500,
        body: '{"error": "server error"}',
      });

      const result = await adapter.refund({
        paymentId: "3811142484",
        reason: "test",
        reference: "corr-xyz",
      });

      expect(result.ok).toBe(false);
    });
  });

  describe("fetchRefund", () => {
    it("returns a RefundResult on success", async () => {
      http.setResponse("GET", "https://api.paystack.co/refund/500", {
        status: 200,
        body: loadFixture("paystack-refund.json"),
      });

      const result = await adapter.fetchRefund!("500");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("succeeded");
        expect(result.value.id).toBe("500");
        expect(result.value.paymentId).toBe("3811142484");
      }
    });

    it("returns error when refund not found", async () => {
      http.setResponse("GET", "https://api.paystack.co/refund/999", {
        status: 404,
        body: '{"status": false, "message": "Refund not found"}',
      });

      const result = await adapter.fetchRefund!("999");

      expect(result.ok).toBe(false);
    });
  });

  describe("parseWebhook", () => {
    it("returns WebhookEvent for valid charge.success", async () => {
      const rawBody = loadFixture("paystack-webhook.json");
      const signature = createHmac("sha512", WEBHOOK_SECRET).update(rawBody).digest("hex");

      const result = await adapter.parseWebhook(
        { "x-paystack-signature": signature },
        rawBody,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe("payment.succeeded");
        expect(result.value.originalType).toBe("charge.success");
        expect(result.value.provider).toBe("paystack");
      }
    });

    it("returns error for bad signature", async () => {
      const result = await adapter.parseWebhook(
        { "x-paystack-signature": "bad-signature" },
        loadFixture("paystack-webhook.json"),
      );

      expect(result.ok).toBe(false);
    });

    it("returns error for missing signature header", async () => {
      const result = await adapter.parseWebhook(
        {},
        loadFixture("paystack-webhook.json"),
      );

      expect(result.ok).toBe(false);
    });
  });
});
