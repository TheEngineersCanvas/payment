import { PaymentError, type PaymentErrorOptions } from "./payment-error.js";
import { ErrorCode, ErrorCategory } from "./error-codes.js";

export class NetworkError extends PaymentError {
  override readonly code = ErrorCode.NETWORK;
  override readonly category = ErrorCategory.NETWORK;
  override readonly httpStatus = 502;
  override readonly isRetryable = true;

  constructor(
    message: string,
    options: Omit<PaymentErrorOptions, "httpStatus" | "isRetryable"> = {},
  ) {
    super(message, { ...options, httpStatus: 502, isRetryable: true });
  }
}
