import { PaymentError, type PaymentErrorOptions } from "./payment-error.js";
import { ErrorCode, ErrorCategory } from "./error-codes.js";

export class ProviderError extends PaymentError {
  readonly code: ErrorCode = ErrorCode.PROVIDER;
  override readonly category = ErrorCategory.PROVIDER;
  override readonly httpStatus: number;
  override readonly isRetryable: boolean;

  constructor(
    message: string,
    options: PaymentErrorOptions & { readonly httpStatus?: number; readonly isRetryable?: boolean } = {},
  ) {
    const status = options.httpStatus ?? 502;
    const retryable = options.isRetryable ?? false;
    super(message, { ...options, httpStatus: status, isRetryable: retryable });
    this.httpStatus = status;
    this.isRetryable = retryable;
  }
}

export class ProviderBadRequestError extends ProviderError {
  override readonly code = ErrorCode.PROVIDER_BAD_REQUEST;
  override readonly httpStatus = 400;
  override readonly isRetryable = false;

  constructor(message: string, options: PaymentErrorOptions = {}) {
    super(message, { ...options, httpStatus: 400, isRetryable: false });
  }
}

export class ProviderUnauthorizedError extends ProviderError {
  override readonly code = ErrorCode.PROVIDER_UNAUTHORIZED;
  override readonly httpStatus = 401;
  override readonly isRetryable = false;

  constructor(message: string, options: PaymentErrorOptions = {}) {
    super(message, { ...options, httpStatus: 401, isRetryable: false });
  }
}

export class ProviderNotFoundError extends ProviderError {
  override readonly code = ErrorCode.PROVIDER_NOT_FOUND;
  override readonly httpStatus = 404;
  override readonly isRetryable = false;

  constructor(message: string, options: PaymentErrorOptions = {}) {
    super(message, { ...options, httpStatus: 404, isRetryable: false });
  }
}

export class ProviderConflictError extends ProviderError {
  override readonly code = ErrorCode.PROVIDER_CONFLICT;
  override readonly httpStatus = 409;
  override readonly isRetryable = false;

  constructor(message: string, options: PaymentErrorOptions = {}) {
    super(message, { ...options, httpStatus: 409, isRetryable: false });
  }
}

export class ProviderRateLimitError extends ProviderError {
  override readonly code = ErrorCode.PROVIDER_RATE_LIMIT;
  override readonly httpStatus = 429;
  override readonly isRetryable = true;

  constructor(message: string, options: PaymentErrorOptions = {}) {
    super(message, { ...options, httpStatus: 429, isRetryable: true });
  }
}
