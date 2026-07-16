import type { Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";

export interface HttpRequest {
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly timeoutMs?: number;
  readonly isRetryable?: boolean;
  readonly correlationId?: string;
  readonly idempotencyKey?: string;
}

export interface HttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export interface HttpClient {
  send(request: HttpRequest): Promise<Result<HttpResponse, PaymentError>>;
}
