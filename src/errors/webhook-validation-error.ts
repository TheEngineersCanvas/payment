import { PaymentError, type PaymentErrorOptions } from "./payment-error.js";
import { ErrorCode, ErrorCategory } from "./error-codes.js";

export class WebhookValidationError extends PaymentError {
  override readonly code = ErrorCode.WEBHOOK_VALIDATION;
  override readonly category = ErrorCategory.WEBHOOK;
  override readonly httpStatus = 401;
  override readonly isRetryable = false;

  constructor(
    message: string,
    options: Omit<PaymentErrorOptions, "httpStatus" | "isRetryable"> = {},
  ) {
    super(message, { ...options, httpStatus: 401, isRetryable: false });
  }
}
