import { PaymentError, type PaymentErrorOptions } from "./payment-error.js";
import { ErrorCode, ErrorCategory } from "./error-codes.js";

export class ProviderUnavailableError extends PaymentError {
  override readonly code = ErrorCode.PROVIDER_UNAVAILABLE;
  override readonly category = ErrorCategory.PROVIDER;
  override readonly httpStatus = 502;
  override readonly isRetryable = true;

  constructor(
    message: string,
    options: Omit<PaymentErrorOptions, "httpStatus" | "isRetryable"> = {},
  ) {
    super(message, { ...options, httpStatus: 502, isRetryable: true });
  }
}
