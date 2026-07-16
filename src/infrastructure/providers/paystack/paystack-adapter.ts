import type { PaymentProvider, ProviderCapabilities, ListQuery, Page, HealthStatus, RefundRequest, RefundResult } from "../../../application/ports/payment-provider.js";
import type { Provider } from "../../../domain/provider/provider.js";
import type { Payment } from "../../../domain/payment/payment.js";
import type { PaymentRequest } from "../../../domain/payment/payment-request.js";
import type { PaymentReference } from "../../../domain/reference/payment-reference.js";
import type { Currency } from "../../../domain/money/currency.js";
import type { WebhookEvent } from "../../../domain/webhook/webhook-event.js";
import type { HttpClient } from "../../../application/ports/http-client.js";
import type { Logger } from "../../../application/ports/logger.js";
import type { Clock } from "../../../application/ports/clock.js";
import type { EventBus } from "../../../application/ports/event-bus.js";
import type { IdGenerator } from "../../../application/ports/id-generator.js";
import type { WebhookVerifier } from "../../../application/ports/webhook-verifier.js";
import { ok, err, type Result } from "../../../shared/result/result.js";
import { ProviderError } from "../../../errors/provider-error.js";
import type { PaymentError } from "../../../errors/payment-error.js";
import type { WebhookValidationError } from "../../../errors/webhook-validation-error.js";
import type { ProviderConfig } from "../../../application/ports/provider-factory.js";
import type {
  PaystackInitializeResponse,
  PaystackVerifyResponse,
  PaystackListResponse,
  PaystackInitializeRequest,
  PaystackRefundResponse,
} from "./paystack-types.js";
import {
  mapInitializeResponse,
  mapPaystackResponseToPayment,
  mapPaystackListResponse,
  mapPaystackRefundResponse,
} from "./paystack-mapper.js";
import { parsePaystackWebhook } from "./paystack-webhook.js";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

const PAYSTACK_CAPABILITIES: ProviderCapabilities = {
  supportsAuthorizationUrl: true,
  supportsRecurring: true,
  supportsPartialRefund: true,
  supportsWebhooks: true,
  supportedCurrencies: [
    "NGN" as Currency,
    "GHS" as Currency,
    "ZAR" as Currency,
    "KES" as Currency,
    "USD" as Currency,
  ],
  supportedChannels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
};

export class PaystackAdapter implements PaymentProvider {
  readonly id: Provider;
  readonly capabilities: ProviderCapabilities;

  private readonly httpClient: HttpClient;
  private readonly logger: Logger;
  private readonly clock: Clock;
  private readonly eventBus: EventBus;
  private readonly idGenerator: IdGenerator;
  private readonly webhookVerifier: WebhookVerifier;
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: ProviderConfig, deps: PaystackAdapterDeps) {
    this.id = "paystack" as Provider;
    this.capabilities = PAYSTACK_CAPABILITIES;

    this.httpClient = deps.httpClient;
    this.logger = deps.logger;
    this.clock = deps.clock;
    this.eventBus = deps.eventBus;
    this.idGenerator = deps.idGenerator;
    this.webhookVerifier = deps.webhookVerifier;
    this.secretKey = config.secretKey;
    this.webhookSecret = config.webhookSecret ?? config.secretKey;
    this.baseUrl = config.baseUrl ?? PAYSTACK_BASE_URL;
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  async initialize(req: PaymentRequest): Promise<Result<Payment, PaymentError>> {
    const payload: PaystackInitializeRequest = {
      amount: req.amount.amount,
      email: getEmail(req.customer),
      reference: req.reference,
      currency: req.amount.currency,
      callback_url: req.callbackUrl,
      channels: req.channels ? req.channels.slice() : undefined,
      metadata: req.metadata
        ? (req.metadata as Readonly<Record<string, string | number | boolean>>)
        : undefined,
    };

    const correlationId = this.idGenerator.generate();

    this.logger.info("initializing payment", {
      provider: "paystack",
      reference: req.reference,
      correlationId,
      amount: String(req.amount.amount),
      currency: req.amount.currency,
    });

    const result = await this.httpClient.send({
      method: "POST",
      url: `${this.baseUrl}/transaction/initialize`,
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
      timeoutMs: this.timeoutMs,
      correlationId,
      idempotencyKey: req.idempotencyKey,
    });

    if (!result.ok) {
      this.logger.error("initialize failed", result.error, {
        provider: "paystack",
        reference: req.reference,
        correlationId,
      });
      return result;
    }

    try {
      const response = JSON.parse(result.value.body) as PaystackInitializeResponse;
      const payment = mapInitializeResponse(response, req);
      return ok(payment);
    } catch (e) {
      return err(this.mapParseError(e, "initialize response"));
    }
  }

  async verify(reference: PaymentReference): Promise<Result<Payment, PaymentError>> {
    const correlationId = this.idGenerator.generate();

    this.logger.info("verifying payment", {
      provider: "paystack",
      reference,
      correlationId,
    });

    const result = await this.httpClient.send({
      method: "GET",
      url: `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      headers: this.authHeaders(),
      timeoutMs: this.timeoutMs,
      correlationId,
    });

    if (!result.ok) return result;

    try {
      const response = JSON.parse(result.value.body) as PaystackVerifyResponse;
      const payment = mapPaystackResponseToPayment(response);
      return ok(payment);
    } catch (e) {
      return err(this.mapParseError(e, "verify response"));
    }
  }

  async fetch(id: string): Promise<Result<Payment, PaymentError>> {
    const correlationId = this.idGenerator.generate();

    this.logger.info("fetching payment", {
      provider: "paystack",
      paymentId: id,
      correlationId,
    });

    const result = await this.httpClient.send({
      method: "GET",
      url: `${this.baseUrl}/transaction/${encodeURIComponent(id)}`,
      headers: this.authHeaders(),
      timeoutMs: this.timeoutMs,
      correlationId,
    });

    if (!result.ok) return result;

    try {
      const response = JSON.parse(result.value.body) as PaystackVerifyResponse;
      const payment = mapPaystackResponseToPayment(response);
      return ok(payment);
    } catch (e) {
      return err(this.mapParseError(e, "fetch response"));
    }
  }

  async list(query: ListQuery): Promise<Result<Page<Payment>, PaymentError>> {
    const correlationId = this.idGenerator.generate();
    const params = new URLSearchParams();

    if (query.perPage) params.set("perPage", String(query.perPage));
    if (query.page) params.set("page", String(query.page));
    if (query.from) params.set("from", query.from.toISOString());
    if (query.to) params.set("to", query.to.toISOString());
    if (query.status) params.set("status", query.status);
    if (query.customer) params.set("customer", query.customer);

    const queryStr = params.toString();
    const url = `${this.baseUrl}/transaction${queryStr ? `?${queryStr}` : ""}`;

    this.logger.info("listing payments", {
      provider: "paystack",
      correlationId,
      query: queryStr,
    });

    const result = await this.httpClient.send({
      method: "GET",
      url,
      headers: this.authHeaders(),
      timeoutMs: this.timeoutMs,
      correlationId,
    });

    if (!result.ok) return result;

    try {
      const response = JSON.parse(result.value.body) as PaystackListResponse;
      const page = mapPaystackListResponse(response);
      return ok(page);
    } catch (e) {
      return err(this.mapParseError(e, "list response"));
    }
  }

  async refund(input: RefundRequest): Promise<Result<RefundResult, PaymentError>> {
    const correlationId = this.idGenerator.generate();

    const body = JSON.stringify({
      transaction: input.paymentId,
      amount: input.amount,
      merchant_note: input.reason,
    });

    this.logger.info("refunding payment", {
      provider: "paystack",
      paymentId: input.paymentId,
      correlationId,
    });

    const result = await this.httpClient.send({
      method: "POST",
      url: `${this.baseUrl}/refund`,
      headers: this.authHeaders(),
      body,
      timeoutMs: this.timeoutMs,
      correlationId,
      idempotencyKey: input.idempotencyKey,
    });

    if (!result.ok) return result;

    try {
      const response = JSON.parse(result.value.body) as PaystackRefundResponse;
      const refund = mapPaystackRefundResponse(response);
      return ok(refund);
    } catch (e) {
      return err(this.mapParseError(e, "refund response"));
    }
  }

  async parseWebhook(
    headers: Readonly<Record<string, string>>,
    rawBody: string,
  ): Promise<Result<WebhookEvent, WebhookValidationError>> {
    return parsePaystackWebhook(headers, rawBody, this.webhookSecret);
  }

  async fetchRefund(refundId: string): Promise<Result<RefundResult, PaymentError>> {
    const correlationId = this.idGenerator.generate();

    this.logger.info("fetching refund", {
      provider: "paystack",
      refundId,
      correlationId,
    });

    const result = await this.httpClient.send({
      method: "GET",
      url: `${this.baseUrl}/refund/${refundId}`,
      headers: this.authHeaders(),
      timeoutMs: this.timeoutMs,
      correlationId,
    });

    if (!result.ok) return result;

    try {
      const response = JSON.parse(result.value.body) as PaystackRefundResponse;
      const refund = mapPaystackRefundResponse(response);
      return ok(refund);
    } catch (e) {
      return err(this.mapParseError(e, "fetch refund response"));
    }
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const result = await this.httpClient.send({
        method: "GET",
        url: `${this.baseUrl}/transaction`,
        headers: this.authHeaders(),
        timeoutMs: 5_000,
      });
      return {
        healthy: result.ok,
        latencyMs: Date.now() - start,
        timestamp: this.clock.now(),
      };
    } catch {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        timestamp: this.clock.now(),
      };
    }
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.secretKey}`,
    };
  }

  private mapParseError(e: unknown, context: string): PaymentError {
    return new ProviderError(
      `Failed to parse ${context}: ${e instanceof Error ? e.message : String(e)}`,
      {
        provider: this.id,
        httpStatus: 502,
        isRetryable: false,
      },
    );
  }
}

export interface PaystackAdapterDeps {
  readonly httpClient: HttpClient;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly eventBus: EventBus;
  readonly idGenerator: IdGenerator;
  readonly webhookVerifier: WebhookVerifier;
}

function getEmail(cr: PaymentRequest["customer"]): string {
  switch (cr.kind) {
    case "inline":
      return cr.customer.email;
    case "new":
      return cr.email;
    case "existing":
      return "unknown";
  }
}
