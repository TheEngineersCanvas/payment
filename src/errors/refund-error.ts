import { PaymentError, type PaymentErrorOptions } from "./payment-error.js";
import { ErrorCode, ErrorCategory } from "./error-codes.js";

export class RefundError extends PaymentError {
  override readonly code = ErrorCode.REFUND;
  override readonly category = ErrorCategory.REFUND;
  override readonly httpStatus = 402;
  override readonly isRetryable = false;

  constructor(
    message: string,
    options: Omit<PaymentErrorOptions, "httpStatus" | "isRetryable"> = {},
  ) {
    super(message, { ...options, httpStatus: 402, isRetryable: false });
  }
}
