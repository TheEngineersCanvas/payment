import type { PaymentClient } from "../application/payment-client.js";
import type { PaymentClientConfig } from "../application/client-config.js";
import { MockHttpClient } from "../infrastructure/http/mock-http-client.js";
import { createPaymentClient } from "./client.js";
import type { Provider } from "../domain/provider/provider.js";

export { MockHttpClient } from "../infrastructure/http/mock-http-client.js";
export type { MockResponse } from "../infrastructure/http/mock-http-client.js";

export interface MockClientOptions {
  readonly provider?: string;
  readonly webhookSecret?: string;
}

export function createMockClient(options?: MockClientOptions): {
  client: PaymentClient;
  http: MockHttpClient;
} {
  const http = new MockHttpClient();
  const webhookSecret = options?.webhookSecret ?? "whsec_mock";
  const providerId = (options?.provider ?? "paystack") as Provider;

  const config: PaymentClientConfig = {
    providers: {
      [providerId]: {
        secretKey: "sk_mock",
        webhookSecret,
        baseUrl: "https://api.paystack.co",
        timeoutMs: 5_000,
      },
    },
    defaultProvider: providerId,
    httpClient: http,
  };

  const client = createPaymentClient(config);

  return { client, http };
}
