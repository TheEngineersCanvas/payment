import { PaymentError, type PaymentErrorOptions } from "./payment-error.js";
import { ErrorCode, ErrorCategory } from "./error-codes.js";

export class InternalError extends PaymentError {
  override readonly code = ErrorCode.INTERNAL;
  override readonly category = ErrorCategory.INTERNAL;
  override readonly httpStatus = 500;
  override readonly isRetryable = false;

  constructor(
    message: string,
    options: Omit<PaymentErrorOptions, "httpStatus" | "isRetryable"> = {},
  ) {
    super(message, { ...options, httpStatus: 500, isRetryable: false });
  }
}
