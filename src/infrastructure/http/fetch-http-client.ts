import type { HttpClient, HttpRequest, HttpResponse } from "../../application/ports/http-client.js";
import type { Logger } from "../../application/ports/logger.js";
import { ok, err, type Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";
import { NetworkError } from "../../errors/network-error.js";
import { TimeoutError } from "../../errors/timeout-error.js";
import { ProviderUnavailableError } from "../../errors/provider-unavailable-error.js";
import { ProviderError } from "../../errors/provider-error.js";
import type { Provider } from "../../domain/provider/provider.js";

const IDEMPOTENT_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD"]);
const DEFAULT_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 500;
const MAX_RETRIES = 1;

export interface FetchHttpClientConfig {
  readonly baseUrl?: string;
  readonly defaultTimeoutMs?: number;
  readonly correlationId?: string;
  readonly provider?: Provider;
  readonly logger?: Logger;
}

export class FetchHttpClient implements HttpClient {
  private readonly baseUrl?: string;
  private readonly defaultTimeoutMs: number;
  private readonly correlationId?: string;
  private readonly provider?: Provider;
  private readonly logger?: Logger;

  constructor(config: FetchHttpClientConfig = {}) {
    this.baseUrl = config.baseUrl;
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.correlationId = config.correlationId;
    this.provider = config.provider;
    this.logger = config.logger;
  }

  async send(request: HttpRequest): Promise<Result<HttpResponse, PaymentError>> {
    const url = this.buildUrl(request.url);
    const timeoutMs = request.timeoutMs ?? this.defaultTimeoutMs;
    const isRetryable = request.isRetryable ?? IDEMPOTENT_METHODS.has(request.method);

    let lastError: PaymentError | undefined;

    const maxAttempts = isRetryable ? 1 + MAX_RETRIES : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        this.logger?.debug("retrying HTTP request", {
          method: request.method,
          url,
          attempt: String(attempt),
        });
        await sleep(RETRY_DELAY_MS);
      }

      const result = await this.attempt(request, url, timeoutMs, attempt);
      if (result.ok) return result;

      lastError = result.error;

      if (!isRetryable || !isRetryableError(lastError)) {
        return result;
      }
    }

    this.logger?.error("HTTP request failed after retries", lastError, {
      method: request.method,
      url,
    });

    return err(lastError!);
  }

  private async attempt(
    request: HttpRequest,
    url: string,
    timeoutMs: number,
    _attempt: number,
  ): Promise<Result<HttpResponse, PaymentError>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...request.headers,
      };

      if (this.correlationId) {
        headers["X-TEC-Correlation-Id"] = this.correlationId;
      }

      const response = await fetch(url, {
        method: request.method,
        headers,
        body: request.body,
        signal: controller.signal,
      });

      const body = await response.text();

      if (!response.ok) {
        return this.mapError(response.status, body, url);
      }

      const respHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        respHeaders[key] = value;
      });

      return ok({
        status: response.status,
        headers: respHeaders,
        body,
      });
    } catch (e: unknown) {
      if (isAbortError(e)) {
        return err(new TimeoutError(`Request to ${url} timed out after ${timeoutMs}ms`, {
          provider: this.provider,
          meta: { url, timeoutMs },
        }));
      }
      const message = e instanceof Error ? e.message : String(e);
      return err(new NetworkError(`Network error for ${url}: ${message}`, {
        provider: this.provider,
        meta: { url },
        cause: e instanceof Error ? e : undefined,
      }));
    } finally {
      clearTimeout(timer);
    }
  }

  private buildUrl(pathOrUrl: string): string {
    const resolved = pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")
      ? pathOrUrl
      : this.baseUrl
        ? `${this.baseUrl.replace(/\/$/, "")}/${pathOrUrl.replace(/^\//, "")}`
        : pathOrUrl;

    if (resolved.startsWith("http://")) {
      throw new NetworkError(`HTTP URLs are not allowed: ${resolved}`, {
        provider: this.provider,
        meta: { url: resolved },
      });
    }

    return resolved;
  }

  private mapError(status: number, body: string, url: string): Result<never, PaymentError> {
    if (status >= 500) {
      return err(new ProviderUnavailableError(
        `Provider returned ${status} for ${url}`,
        {
          provider: this.provider,
          providerCode: String(status),
          meta: { url, status, body: body.slice(0, 500) },
        },
      ));
    }

    if (status === 429) {
      return err(new ProviderError(
        `Rate limited (${status}) by provider`,
        {
          provider: this.provider,
          providerCode: String(status),
          httpStatus: status,
          isRetryable: true,
          meta: { url, body: body.slice(0, 500) },
        },
      ));
    }

    return err(new ProviderError(
      `Provider returned error ${status}`,
      {
        provider: this.provider,
        providerCode: String(status),
        httpStatus: status,
        isRetryable: false,
        meta: { url, body: body.slice(0, 500) },
      },
    ));
  }
}

function isAbortError(e: unknown): boolean {
  if (e instanceof Error && e.name === "AbortError") return true;
  return false;
}

function isRetryableError(error: PaymentError): boolean {
  if (error.isRetryable) return true;
  if (error instanceof ProviderUnavailableError) return true;
  if (error instanceof NetworkError) return true;
  if (error instanceof TimeoutError) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
