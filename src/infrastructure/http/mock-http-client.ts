import type { HttpClient, HttpRequest, HttpResponse } from "../../application/ports/http-client.js";
import { ok, err, type Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";
import { ProviderError } from "../../errors/provider-error.js";

export interface MockResponse {
  readonly status: number;
  readonly body: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export class MockHttpClient implements HttpClient {
  private responses: Map<string, MockResponse> = new Map();
  private requests: HttpRequest[] = [];

  on(method: string, urlMatch: string, response: MockResponse): this {
    this.responses.set(`${method}:${urlMatch}`, response);
    return this;
  }

  getRequests(): ReadonlyArray<HttpRequest> {
    return this.requests;
  }

  clearRequests(): void {
    this.requests = [];
  }

  reset(): void {
    this.requests = [];
    this.responses.clear();
  }

  async send(request: HttpRequest): Promise<Result<HttpResponse, PaymentError>> {
    this.requests.push(request);

    const exactKey = `${request.method}:${request.url}`;
    const exactMatch = this.responses.get(exactKey);
    if (exactMatch) {
      return this.buildResponse(exactMatch);
    }

    for (const [storedKey, response] of this.responses.entries()) {
      const [_method, urlPattern] = storedKey.split(":");
      if (urlPattern && request.url.includes(urlPattern)) {
        return this.buildResponse(response);
      }
    }

    return err(new ProviderError(`No mock response for ${exactKey}`, {
      httpStatus: 500,
      isRetryable: false,
    }));
  }

  private buildResponse(response: MockResponse): Result<HttpResponse, PaymentError> {
    if (response.status >= 400) {
      return err(new ProviderError(`HTTP ${response.status}`, {
        httpStatus: response.status,
        isRetryable: response.status >= 500,
      }));
    }

    return ok({
      status: response.status,
      headers: response.headers ?? { "content-type": "application/json" },
      body: response.body,
    });
  }
}
