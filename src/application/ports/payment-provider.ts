import type { Provider } from "../../domain/provider/provider.js";
import type { Payment } from "../../domain/payment/payment.js";
import type { PaymentReference } from "../../domain/reference/payment-reference.js";
import type { PaymentRequest } from "../../domain/payment/payment-request.js";
import type { PaymentChannel } from "../../domain/payment/payment-channel.js";
import type { Currency } from "../../domain/money/currency.js";
import type { Money } from "../../domain/money/money.js";
import type { WebhookEvent } from "../../domain/webhook/webhook-event.js";
import type { Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";
import type { WebhookValidationError } from "../../errors/webhook-validation-error.js";

export interface ProviderCapabilities {
  readonly supportsAuthorizationUrl: boolean;
  readonly supportsRecurring: boolean;
  readonly supportsPartialRefund: boolean;
  readonly supportsWebhooks: boolean;
  readonly maxAmount?: Money;
  readonly supportedCurrencies: ReadonlyArray<Currency>;
  readonly supportedChannels: ReadonlyArray<PaymentChannel>;
}

export interface ListQuery {
  readonly page?: number;
  readonly perPage?: number;
  readonly from?: Date;
  readonly to?: Date;
  readonly status?: string;
  readonly customer?: string;
}

export interface Page<T> {
  readonly items: ReadonlyArray<T>;
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
}

export interface HealthStatus {
  readonly healthy: boolean;
  readonly latencyMs: number;
  readonly timestamp: Date;
}

export interface RefundRequest {
  readonly paymentId: string;
  readonly amount?: number;
  readonly reason: string;
  readonly reference: string;
}

export interface RefundResult {
  readonly id: string;
  readonly paymentId: string;
  readonly amount: Money;
  readonly status: "pending" | "processing" | "succeeded" | "failed";
  readonly reason: string;
  readonly reference: string;
  readonly createdAt: Date;
  readonly completedAt?: Date;
}

export interface PaymentProvider {
  readonly id: Provider;
  readonly capabilities: ProviderCapabilities;

  initialize(req: PaymentRequest): Promise<Result<Payment, PaymentError>>;
  verify(reference: PaymentReference): Promise<Result<Payment, PaymentError>>;
  fetch(id: string): Promise<Result<Payment, PaymentError>>;
  list(query: ListQuery): Promise<Result<Page<Payment>, PaymentError>>;
  refund(input: RefundRequest): Promise<Result<RefundResult, PaymentError>>;
  parseWebhook(
    headers: Readonly<Record<string, string>>,
    rawBody: string,
  ): Promise<Result<WebhookEvent, WebhookValidationError>>;
  health(): Promise<HealthStatus>;
}
