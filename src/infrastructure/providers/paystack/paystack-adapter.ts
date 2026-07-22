import type { PaymentProvider, ProviderCapabilities, ListQuery, Page, HealthStatus, RefundRequest, RefundResult, CreateRecipientInput, InitiateTransferInput, ResolveAccountResult } from "../../../application/ports/payment-provider.js";
import type { Provider } from "../../../domain/provider/provider.js";
import type { Payment } from "../../../domain/payment/payment.js";
import type { PaymentRequest } from "../../../domain/payment/payment-request.js";
import type { PaymentReference } from "../../../domain/reference/payment-reference.js";
import type { Currency } from "../../../domain/money/currency.js";
import type { WebhookEvent } from "../../../domain/webhook/webhook-event.js";
import type { Transfer } from "../../../domain/transfer/transfer.js";
import type { TransferRecipient } from "../../../domain/transfer/transfer-recipient.js";
import type { BankCode } from "../../../domain/transfer/bank-code.js";
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
import type {
  PaystackBankListResponse,
  PaystackResolveAccountResponse,
  PaystackCreateRecipientRequest,
  PaystackCreateRecipientResponse,
  PaystackTransferRequest,
  PaystackTransferResponse,
  PaystackTransferListResponse,
} from "./paystack-transfer-types.js";
import {
  mapPaystackBankListResponse,
  mapPaystackCreateRecipientResponse,
  mapPaystackTransferResponse,
  mapPaystackTransferListResponse,
} from "./paystack-transfer-mapper.js";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

const PAYSTACK_CAPABILITIES: ProviderCapabilities = {
  supportsAuthorizationUrl: true,
  supportsRecurring: true,
  supportsPartialRefund: true,
  supportsWebhooks: true,
  supportsTransfers: true,
  supportedCurrencies: [
    "NGN" as Currency,
    "GHS" as Currency,
    "ZAR" as Currency,
    "KES" as Currency,
    "USD" as Currency,
  ],
  supportedChannels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
  supportedTransferCurrencies: [
    "NGN" as Currency,
    "GHS" as Currency,
    "ZAR" as Currency,
    "KES" as Currency,
  ],
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

    const correlationId = req.correlationId ?? this.idGenerator.generate();

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
    const correlationId = input.correlationId ?? this.idGenerator.generate();

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

  async listBankCodes(input: { currency: Currency }): Promise<Result<ReadonlyArray<BankCode>, PaymentError>> {
    const correlationId = this.idGenerator.generate();

    this.logger.info("listing bank codes", {
      provider: "paystack",
      currency: input.currency,
      correlationId,
    });

    const result = await this.httpClient.send({
      method: "GET",
      url: `${this.baseUrl}/bank?currency=${encodeURIComponent(input.currency)}&perPage=100`,
      headers: this.authHeaders(),
      timeoutMs: this.timeoutMs,
      correlationId,
    });

    if (!result.ok) return result;

    try {
      const response = JSON.parse(result.value.body) as PaystackBankListResponse;
      const banks = mapPaystackBankListResponse(response);
      return ok(banks);
    } catch (e) {
      return err(this.mapParseError(e, "bank list response"));
    }
  }

  async resolveAccount(input: { accountNumber: string; bankCode: string; currency: Currency }): Promise<Result<ResolveAccountResult, PaymentError>> {
    const correlationId = this.idGenerator.generate();

    const params = new URLSearchParams({
      account_number: input.accountNumber,
      bank_code: input.bankCode,
    });

    this.logger.info("resolving account", {
      provider: "paystack",
      bankCode: input.bankCode,
      correlationId,
    });

    const result = await this.httpClient.send({
      method: "GET",
      url: `${this.baseUrl}/bank/resolve?${params.toString()}`,
      headers: this.authHeaders(),
      timeoutMs: this.timeoutMs,
      correlationId,
    });

    if (!result.ok) return result;

    try {
      const response = JSON.parse(result.value.body) as PaystackResolveAccountResponse;
      if (!response.status) {
        return err(new ProviderError(response.message, {
          provider: this.id,
          httpStatus: 422,
          isRetryable: false,
        }));
      }
      return ok({ accountName: response.data.account_name });
    } catch (e) {
      return err(this.mapParseError(e, "resolve account response"));
    }
  }

  async createRecipient(input: CreateRecipientInput): Promise<Result<TransferRecipient, PaymentError>> {
    const correlationId = this.idGenerator.generate();

    const body: PaystackCreateRecipientRequest = {
      type: "nuban",
      name: input.name,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: input.currency,
      metadata: input.metadata
        ? (input.metadata as Readonly<Record<string, string | number | boolean>>)
        : undefined,
    };

    this.logger.info("creating transfer recipient", {
      provider: "paystack",
      bankCode: input.bankCode,
      correlationId,
    });

    const result = await this.httpClient.send({
      method: "POST",
      url: `${this.baseUrl}/transferrecipient`,
      headers: this.authHeaders(),
      body: JSON.stringify(body),
      timeoutMs: this.timeoutMs,
      correlationId,
    });

    if (!result.ok) return result;

    try {
      const response = JSON.parse(result.value.body) as PaystackCreateRecipientResponse;
      const recipient = mapPaystackCreateRecipientResponse(response);
      return ok(recipient);
    } catch (e) {
      return err(this.mapParseError(e, "create recipient response"));
    }
  }

  async initiateTransfer(input: InitiateTransferInput): Promise<Result<Transfer, PaymentError>> {
    const correlationId = input.correlationId ?? this.idGenerator.generate();

    const body: PaystackTransferRequest = {
      source: "balance",
      amount: input.amount.amount,
      recipient: input.recipientCode,
      reference: input.reference,
      reason: input.reason,
      currency: input.currency,
    };

    this.logger.info("initiating transfer", {
      provider: "paystack",
      reference: input.reference,
      correlationId,
    });

    const result = await this.httpClient.send({
      method: "POST",
      url: `${this.baseUrl}/transfer`,
      headers: this.authHeaders(),
      body: JSON.stringify(body),
      timeoutMs: this.timeoutMs,
      correlationId,
      idempotencyKey: input.idempotencyKey,
    });

    if (!result.ok) return result;

    try {
      const response = JSON.parse(result.value.body) as PaystackTransferResponse;
      const recipient: TransferRecipient = {
        code: input.recipientCode,
        name: "pending",
        accountNumber: "pending",
        bankCode: "pending",
        currency: input.currency,
        createdAt: new Date(),
        metadata: Object.freeze({}),
      };
      const transfer = mapPaystackTransferResponse(response, recipient);
      return ok(transfer);
    } catch (e) {
      return err(this.mapParseError(e, "initiate transfer response"));
    }
  }

  async fetchTransfer(id: string): Promise<Result<Transfer, PaymentError>> {
    const correlationId = this.idGenerator.generate();

    this.logger.info("fetching transfer", {
      provider: "paystack",
      transferId: id,
      correlationId,
    });

    const result = await this.httpClient.send({
      method: "GET",
      url: `${this.baseUrl}/transfer/${encodeURIComponent(id)}`,
      headers: this.authHeaders(),
      timeoutMs: this.timeoutMs,
      correlationId,
    });

    if (!result.ok) return result;

    try {
      const response = JSON.parse(result.value.body) as PaystackTransferResponse;
      const recipient: TransferRecipient = {
        code: String(response.data.recipient),
        name: "unknown",
        accountNumber: "unknown",
        bankCode: "unknown",
        currency: response.data.currency as Currency,
        createdAt: new Date(response.data.created_at),
        metadata: Object.freeze({}),
      };
      const transfer = mapPaystackTransferResponse(response, recipient);
      return ok(transfer);
    } catch (e) {
      return err(this.mapParseError(e, "fetch transfer response"));
    }
  }

  async listTransfers(query: ListQuery): Promise<Result<Page<Transfer>, PaymentError>> {
    const correlationId = this.idGenerator.generate();
    const params = new URLSearchParams();

    if (query.perPage) params.set("perPage", String(query.perPage));
    if (query.page) params.set("page", String(query.page));
    if (query.from) params.set("from", query.from.toISOString());
    if (query.to) params.set("to", query.to.toISOString());

    const queryStr = params.toString();
    const url = `${this.baseUrl}/transfer${queryStr ? `?${queryStr}` : ""}`;

    this.logger.info("listing transfers", {
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
      const response = JSON.parse(result.value.body) as PaystackTransferListResponse;
      const noopRecipient = () => null;
      const page = mapPaystackTransferListResponse(response, noopRecipient);
      return ok(page);
    } catch (e) {
      return err(this.mapParseError(e, "list transfers response"));
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
