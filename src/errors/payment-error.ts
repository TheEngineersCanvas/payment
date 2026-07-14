import type { ErrorCode, ErrorCategory } from "./error-codes.js";
import type { Provider } from "../domain/provider/provider.js";

export interface PaymentErrorOptions {
  readonly provider?: Provider;
  readonly providerCode?: string;
  readonly correlationId?: string;
  readonly isRetryable?: boolean;
  readonly httpStatus?: number;
  readonly meta?: Readonly<Record<string, unknown>>;
  readonly cause?: unknown;
}

export abstract class PaymentError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly category: ErrorCategory;

  readonly provider?: Provider;
  readonly providerCode?: string;
  readonly correlationId: string;
  readonly isRetryable: boolean;
  readonly httpStatus: number;
  readonly meta?: Readonly<Record<string, unknown>>;

  constructor(message: string, options: PaymentErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.provider = options.provider;
    this.providerCode = options.providerCode;
    this.correlationId = options.correlationId ?? "unknown";
    this.isRetryable = options.isRetryable ?? false;
    this.httpStatus = options.httpStatus ?? 500;
    this.meta = options.meta;
  }
}
