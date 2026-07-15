import { describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";
import type { PaymentProvider } from "../ports/payment-provider.js";
import type { EventBus } from "../ports/event-bus.js";
import type { Logger } from "../ports/logger.js";
import { Provider } from "../../domain/provider/provider.js";
import { parseWebhook } from "../use-cases/parse-webhook.js";
import type { ParseWebhookDeps } from "../use-cases/parse-webhook.js";
import type { WebhookValidationError } from "../../errors/webhook-validation-error.js";
import type { WebhookEvent } from "../../domain/webhook/webhook-event.js";
import type { Result } from "../../shared/result/result.js";

type ParseWebhookMockResult = Result<WebhookEvent, WebhookValidationError>;

const WEBHOOK_SECRET = "whsec_test_123";

const fakeLogger: Logger = {
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  child: vi.fn(),
};

function makeDeps(
  overrides?: Partial<ParseWebhookDeps>,
  parseWebhookImpl?: PaymentProvider["parseWebhook"],
): ParseWebhookDeps {
  const provider: PaymentProvider = {
    id: Provider("paystack"),
    capabilities: {} as PaymentProvider["capabilities"],
    initialize: vi.fn(),
    verify: vi.fn(),
    fetch: vi.fn(),
    list: vi.fn(),
    refund: vi.fn(),
    parseWebhook: parseWebhookImpl ?? vi.fn(),
    health: vi.fn(),
  };

  return {
    provider,
    eventBus: { emit: vi.fn(), on: vi.fn(), onAny: vi.fn() },
    logger: overrides?.logger ?? fakeLogger,
    clock: { now: () => new Date("2026-07-15T12:00:00Z") },
    idGenerator: { generate: () => "test-correlation-id" },
  };
}

function sign(body: string, secret: string): string {
  return createHmac("sha512", secret).update(body).digest("hex");
}

describe("parseWebhook", () => {
  const validBody = JSON.stringify({
    event: "charge.success",
    data: {
      id: 123,
      reference: "order-001",
      status: "success",
      amount: 5000,
      currency: "NGN",
      channel: "card",
      gateway_response: "Successful",
      paid_at: "2026-07-15T12:00:00.000Z",
      created_at: "2026-07-15T11:59:00.000Z",
      updated_at: "2026-07-15T12:00:00.000Z",
      customer: { id: 1, email: "test@example.com", customer_code: "CUS_1" },
      metadata: {},
    },
  });

  it("returns WebhookEvent on valid signature", async () => {
    const sig = sign(validBody, WEBHOOK_SECRET);
    const deps = makeDeps({});

    vi.mocked(deps.provider.parseWebhook).mockResolvedValue({
      ok: true,
      value: {
        id: "123",
        provider: Provider("paystack"),
        type: "payment.succeeded",
        originalType: "charge.success",
        createdAt: new Date(),
        receivedAt: new Date(),
        payload: {},
        raw: {},
      },
    } as ParseWebhookMockResult);

    const result = await parseWebhook(deps, {
      rawBody: validBody,
      signature: sig,
      headers: { "x-paystack-signature": sig },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("payment.succeeded");
      expect(result.value.provider).toBe("paystack");
    }
    expect(deps.eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "webhook.received",
        eventId: "123",
        eventType: "payment.succeeded",
      }),
    );
  });

  it("returns error for invalid signature", async () => {
    const mockParse: PaymentProvider["parseWebhook"] = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        code: "WEBHOOK_VALIDATION",
        message: "Invalid signature",
        category: "webhook",
        httpStatus: 401,
        isRetryable: false,
        correlationId: "c1",
      },
    } as ParseWebhookMockResult);

    const deps = makeDeps({}, mockParse);

    const result = await parseWebhook(deps, {
      rawBody: validBody,
      signature: "bad-signature",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("WEBHOOK_VALIDATION");
    }
  });

  it("returns error for non-UTF-8 Buffer body", async () => {
    const deps = makeDeps({});
    const badBuffer = Buffer.from([0xFF, 0xFE, 0x00]);

    const result = await parseWebhook(deps, {
      rawBody: badBuffer,
      signature: "any",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("WEBHOOK_VALIDATION");
      expect(result.error.message).toContain("UTF-8");
    }
  });

  it("accepts Buffer body that is valid UTF-8", async () => {
    const sig = sign(validBody, WEBHOOK_SECRET);
    const deps = makeDeps({});

    vi.mocked(deps.provider.parseWebhook).mockResolvedValue({
      ok: true,
      value: {
        id: "456",
        provider: Provider("paystack"),
        type: "payment.succeeded",
        originalType: "charge.success",
        createdAt: new Date(),
        receivedAt: new Date(),
        payload: {},
        raw: {},
      },
    } as ParseWebhookMockResult);

    const buffer = Buffer.from(validBody, "utf8");
    const result = await parseWebhook(deps, {
      rawBody: buffer,
      signature: sig,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe("456");
    }
  });
});
