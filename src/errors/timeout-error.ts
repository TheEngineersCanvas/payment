import { PaymentError, type PaymentErrorOptions } from "./payment-error.js";
import { ErrorCode, ErrorCategory } from "./error-codes.js";

export class TimeoutError extends PaymentError {
  override readonly code = ErrorCode.TIMEOUT;
  override readonly category = ErrorCategory.TIMEOUT;
  override readonly httpStatus = 504;
  override readonly isRetryable = true;

  constructor(
    message: string,
    options: Omit<PaymentErrorOptions, "httpStatus" | "isRetryable"> = {},
  ) {
    super(message, { ...options, httpStatus: 504, isRetryable: true });
  }
}
