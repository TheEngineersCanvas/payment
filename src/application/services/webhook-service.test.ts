import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PaymentProvider } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import { Provider } from "../../domain/provider/provider.js";
import { WebhookService } from "./webhook-service.js";
import type { WebhookEvent } from "../../domain/webhook/webhook-event.js";
import type { WebhookValidationError } from "../../errors/webhook-validation-error.js";
import type { Result } from "../../shared/result/result.js";

const fakeLogger: Logger = {
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  child: () => fakeLogger,
};

function makeProvider(id: string): PaymentProvider {
  return {
    id: Provider(id),
    capabilities: {} as PaymentProvider["capabilities"],
    initialize: vi.fn(),
    verify: vi.fn(),
    fetch: vi.fn(),
    list: vi.fn(),
    refund: vi.fn(),
    parseWebhook: vi.fn(),
    health: vi.fn(),
    listBankCodes: vi.fn(),
    resolveAccount: vi.fn(),
    createRecipient: vi.fn(),
    initiateTransfer: vi.fn(),
    fetchTransfer: vi.fn(),
    listTransfers: vi.fn(),
  };
}

function makeServiceDeps() {
  return {
    eventBus: { emit: vi.fn(), on: vi.fn(), onAny: vi.fn() },
    logger: fakeLogger,
    clock: { now: () => new Date("2026-07-15T12:00:00Z") },
    idGenerator: { generate: () => "test-correlation-id" },
  };
}

const validBody = JSON.stringify({ event: "charge.success", data: { id: 1 } });

describe("WebhookService", () => {
  let paystack: PaymentProvider;
  let stripe: PaymentProvider;
  let service: WebhookService;

  function mockParseSuccess(provider: PaymentProvider) {
    vi.mocked(provider.parseWebhook).mockResolvedValue({
      ok: true,
      value: {
        id: "evt-1",
        provider: provider.id,
        type: "payment.succeeded",
        originalType: "charge.success",
        createdAt: new Date(),
        receivedAt: new Date(),
        payload: {},
        raw: {},
      } as WebhookEvent,
    } as Result<WebhookEvent, WebhookValidationError>);
  }

  function mockParseFailure(provider: PaymentProvider) {
    vi.mocked(provider.parseWebhook).mockResolvedValue({
      ok: false,
      error: {
        code: "WEBHOOK_VALIDATION",
        message: "Invalid signature",
        category: "webhook",
        httpStatus: 401,
        isRetryable: false,
        correlationId: "c1",
      },
    } as Result<WebhookEvent, WebhookValidationError>);
  }

  beforeEach(() => {
    paystack = makeProvider("paystack");
    stripe = makeProvider("stripe");
  });

  it("routes to the correct provider when input.provider is set", async () => {
    service = new WebhookService(
      new Map([[paystack.id, paystack], [stripe.id, stripe]]),
      makeServiceDeps(),
    );
    mockParseSuccess(paystack);
    mockParseFailure(stripe);

    const result = await service.receive({
      provider: "paystack",
      rawBody: validBody,
      signature: "sig",
    });

    expect(result.ok).toBe(true);
    expect(paystack.parseWebhook).toHaveBeenCalledOnce();
    expect(stripe.parseWebhook).not.toHaveBeenCalled();
  });

  it("returns error when specified provider is not found", async () => {
    service = new WebhookService(
      new Map([[paystack.id, paystack]]),
      makeServiceDeps(),
    );

    const result = await service.receive({
      provider: "unknown_provider",
      rawBody: validBody,
      signature: "sig",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Unknown provider");
    }
  });

  it("finds the matching provider via try-all when no provider is specified", async () => {
    service = new WebhookService(
      new Map([[paystack.id, paystack], [stripe.id, stripe]]),
      makeServiceDeps(),
    );
    mockParseFailure(paystack);
    mockParseSuccess(stripe);

    const result = await service.receive({
      rawBody: validBody,
      signature: "sig",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.provider).toBe("stripe");
    }
    expect(paystack.parseWebhook).toHaveBeenCalledOnce();
    expect(stripe.parseWebhook).toHaveBeenCalledOnce();
  });

  it("returns error when no provider matches in try-all", async () => {
    service = new WebhookService(
      new Map([[paystack.id, paystack], [stripe.id, stripe]]),
      makeServiceDeps(),
    );
    mockParseFailure(paystack);
    mockParseFailure(stripe);

    const result = await service.receive({
      rawBody: validBody,
      signature: "sig",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("rejected by all");
    }
  });

  it("uses the first matching provider in try-all", async () => {
    service = new WebhookService(
      new Map([[paystack.id, paystack], [stripe.id, stripe]]),
      makeServiceDeps(),
    );
    mockParseSuccess(paystack);
    mockParseFailure(stripe);

    const result = await service.receive({
      rawBody: validBody,
      signature: "sig",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.provider).toBe("paystack");
    }
    expect(stripe.parseWebhook).not.toHaveBeenCalled();
  });
});
