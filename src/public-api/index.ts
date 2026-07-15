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
export type { EventBus, EventSubscription } from "../application/ports/event-bus.js";
