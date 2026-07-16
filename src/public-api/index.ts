export { VERSION } from "./version.js";

export type { Currency } from "../domain/money/currency.js";
export { Money, MinorUnits } from "../domain/money/money.js";
export { PaymentReference } from "../domain/reference/payment-reference.js";
export { Provider } from "../domain/provider/provider.js";
export type { Metadata } from "../domain/metadata/metadata.js";

export type { Result } from "../shared/result/result.js";
export { ok, err, attempt } from "../shared/result/result.js";

export type { PaymentErrorOptions } from "../errors/payment-error.js";
export { PaymentError } from "../errors/payment-error.js";
export { ConfigurationError } from "../errors/configuration-error.js";
export { ValidationError } from "../errors/validation-error.js";
export {
  ProviderError,
  ProviderBadRequestError,
  ProviderUnauthorizedError,
  ProviderNotFoundError,
  ProviderConflictError,
  ProviderRateLimitError,
} from "../errors/provider-error.js";
export { ProviderUnavailableError } from "../errors/provider-unavailable-error.js";
export { NetworkError } from "../errors/network-error.js";
export { TimeoutError } from "../errors/timeout-error.js";
export { WebhookValidationError } from "../errors/webhook-validation-error.js";
export { VerificationError } from "../errors/verification-error.js";
export { RefundError } from "../errors/refund-error.js";
export { InternalError } from "../errors/internal-error.js";

export { ErrorCode, ErrorCategory } from "../errors/error-codes.js";

export { createPaymentClient } from "./client.js";
export type { PaymentClient } from "../application/payment-client.js";
export type { PaymentClientConfig } from "../application/client-config.js";
export type { Logger } from "../application/ports/logger.js";
export type { EventBus, EventSubscription, EventHandler, Unsubscribe } from "../application/ports/event-bus.js";

export type { Clock } from "../application/ports/clock.js";
export type { IdGenerator } from "../application/ports/id-generator.js";
export type { HttpClient, HttpRequest, HttpResponse } from "../application/ports/http-client.js";

export type {
  ProviderCapabilities,
  ListQuery,
  Page,
  HealthStatus,
  RefundRequest,
  RefundResult,
} from "../application/ports/payment-provider.js";

export type { Payment } from "../domain/payment/payment.js";
export type { PaymentStatus, PaymentStatusKind } from "../domain/payment/payment-status.js";
export { isFinalStatus, isTransitionAllowed } from "../domain/payment/payment-status.js";
export type { PaymentRequest, CustomerReference } from "../domain/payment/payment-request.js";
export type { PaymentChannel } from "../domain/payment/payment-channel.js";
export type { PaymentAttempt } from "../domain/payment/payment-attempt.js";
export type { Customer } from "../domain/customer/customer.js";

export type { Refund } from "../domain/refund/refund.js";
export type { RefundStatus, RefundStatusKind } from "../domain/refund/refund-status.js";
export { isFinalRefundStatus } from "../domain/refund/refund-status.js";
export { RefundReason } from "../domain/refund/refund-reason.js";

export type { WebhookEvent } from "../domain/webhook/webhook-event.js";

export type {
  PaymentEvent,
  PaymentEventType,
  PaymentInitialized,
  PaymentPending,
  PaymentSucceeded,
  PaymentFailed,
  VerificationCompleted,
  WebhookReceived,
  RefundInitiated,
  RefundSucceeded,
  RefundFailed,
} from "../domain/events/payment-events.js";

export type { WebhookInput } from "../application/services/webhook-service.js";
export type { RefundCreateInput } from "../application/services/refund-service.js";
