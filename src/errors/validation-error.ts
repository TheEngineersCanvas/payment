import { PaymentError, type PaymentErrorOptions } from "./payment-error.js";
import { ErrorCode, ErrorCategory } from "./error-codes.js";

export class ValidationError extends PaymentError {
  override readonly code = ErrorCode.VALIDATION;
  override readonly category = ErrorCategory.VALIDATION;
  override readonly httpStatus = 400;
  override readonly isRetryable = false;

  constructor(
    message: string,
    options: Omit<PaymentErrorOptions, "httpStatus" | "isRetryable"> = {},
  ) {
    super(message, { ...options, httpStatus: 400, isRetryable: false });
  }
}
