import type { HttpClient, HttpRequest, HttpResponse } from "../../src/application/ports/http-client.js";
import { ok, err, type Result } from "../../src/shared/result/result.js";
import type { PaymentError } from "../../src/errors/payment-error.js";
import { ProviderError } from "../../src/errors/provider-error.js";

export interface MockResponse {
  readonly status: number;
  readonly body: string;
}

export class MockHttpClient implements HttpClient {
  private responses: Map<string, MockResponse> = new Map();
  private requests: HttpRequest[] = [];

  setResponse(method: string, urlMatch: string, response: MockResponse): void {
    this.responses.set(`${method}:${urlMatch}`, response);
  }

  getRequests(): ReadonlyArray<HttpRequest> {
    return this.requests;
  }

  clearRequests(): void {
    this.requests = [];
  }

  async send(request: HttpRequest): Promise<Result<HttpResponse, PaymentError>> {
    this.requests.push(request);

    const key = `${request.method}:${request.url}`;

    const mockResponse = this.responses.get(key);
    if (!mockResponse) {
      for (const [storedKey, response] of this.responses.entries()) {
        if (request.url.includes(storedKey.split(":")[1]!)) {
          return this.buildResponse(response);
        }
      }

      return err(new ProviderError(`No mock response for ${key}`, {
        httpStatus: 500,
        isRetryable: false,
      }));
    }

    return this.buildResponse(mockResponse);
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
      headers: { "content-type": "application/json" },
      body: response.body,
    });
  }
}
