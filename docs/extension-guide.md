# Extension Guide

Guide for extending `@TheEngineersCanvas/payment` — adding providers, custom HTTP clients, loggers, and event buses.

## Architecture Recap

`@TheEngineersCanvas/payment` follows hexagonal (ports & adapters) architecture:

```
Application Code → public-api/ → application/ (use cases + ports) → infrastructure/ (adapters)
                                  ↑                                   ↑
                                  └──────── domain/ (pure ▪ no I/O) ─┘
```

The SDK exposes **ports** (interfaces) and provides **adapters** (default implementations). You can swap any adapter by implementing the port and injecting it.

## Adding a New Payment Provider

### 1. Understand the contract

The `PaymentProvider` interface (in `src/application/ports/payment-provider.ts`) defines the methods every adapter must implement:

| Method | HTTP Verb | Purpose |
|--------|-----------|---------|
| `initialize(req)` | POST | Create a payment, return authorization URL |
| `verify(reference)` | GET | Confirm payment status by reference |
| `fetch(id)` | GET | Look up a single payment by provider-assigned ID |
| `list(query)` | GET | Paginated list of payments for reconciliation |
| `refund(input)` | POST | Create a refund (full or partial) |
| `parseWebhook(headers, rawBody)` | — | Verify signature and parse webhook event |
| `fetchRefund(id)` | GET | Fetch a specific refund by ID (optional) |
| `health()` | — | Liveness probe |

### 2. Define provider DTOs

Create type definitions for your provider's API request/response shapes. These are internal — never exported.

```ts
// src/infrastructure/providers/my-provider/my-provider-types.ts
export interface MyProviderApiResponse {
  readonly status: string;
  readonly data: MyProviderTransactionData;
}
```

### 3. Implement a mapper

Translate between provider DTOs and domain types. The domain types are in `src/domain/`.

```ts
// src/infrastructure/providers/my-provider/my-provider-mapper.ts
import type { Payment } from "../../../domain/payment/payment.js";
import type { WebhookEvent } from "../../../domain/webhook/webhook-event.js";
import type { RefundResult, Page } from "../../../application/ports/payment-provider.js";

export function mapToPayment(data: MyProviderApiResponse): Payment { ... }
export function mapToWebhookEvent(data: MyProviderWebhookPayload): WebhookEvent { ... }
export function mapToRefundResult(data: MyProviderRefundResponse): RefundResult { ... }
```

### 4. Implement the adapter

```ts
// src/infrastructure/providers/my-provider/my-provider-adapter.ts
import type { PaymentProvider, ListQuery, Page, RefundRequest, RefundResult, HealthStatus } from "../../../application/ports/payment-provider.js";
import type { HttpClient } from "../../../application/ports/http-client.js";

export class MyProviderAdapter implements PaymentProvider {
  readonly id = "my_provider";
  readonly capabilities = { ... };

  constructor(
    private readonly httpClient: HttpClient,
    private readonly secretKey: string,
  ) {}

  async initialize(req: PaymentRequest): Promise<Result<Payment, PaymentError>> { ... }
  async verify(reference: PaymentReference): Promise<Result<Payment, PaymentError>> { ... }
  // ... etc
}
```

### 5. Register the provider

Hook into the `ProviderFactory` registry:

```ts
// src/infrastructure/providers/my-provider/register.ts
import { registerProvider } from "../provider-factory.js";
import { MyProviderAdapter } from "./my-provider-adapter.js";

registerProvider("my_provider", {
  create(deps, config) {
    return new MyProviderAdapter(deps.httpClient, config.secretKey);
  },
});
```

Import the register file before calling `createPaymentClient`:

```ts
import "@TheEngineersCanvas/payment/my-provider/register"; // auto-registers
import { createPaymentClient } from "@TheEngineersCanvas/payment";
```

### 6. Contract test

Every provider adapter must pass the contract test suite. Add your adapter to `tests/contract/provider-contract.spec.ts` following the existing Paystack pattern.

### 7. Webhook verification

Each provider has a different signature scheme:
- Paystack: `x-paystack-signature` header, HMAC-SHA512 of raw body
- Stripe: `stripe-signature` header, timestamped HMAC-SHA256
- Use the `WebhookVerifier` port for signature checks

## Swapping Infrastructure Components

### Custom HTTP Client

Implement `HttpClient` from `application/ports/http-client.ts`:

```ts
const client = createPaymentClient({
  providers: { paystack: { secretKey: "sk_..." } },
  httpClient: new MyHttpClient(),
});
```

### Custom Logger

Implement `Logger`:

```ts
const client = createPaymentClient({
  providers: { paystack: { secretKey: "sk_..." } },
  logger: new MyLogger(),
});
```

### Custom Event Bus

Implement `EventBus`:

```ts
const client = createPaymentClient({
  providers: { paystack: { secretKey: "sk_..." } },
  eventBus: new MyEventBus(),
});
```

## Testing Patterns

- **MockHttpClient:** Use `MockHttpClient` from `tests/helpers/` to stub provider API responses
- **In-process HTTP server:** Spin up `node:http` for end-to-end webhook tests (see `tests/integration/webhook-flow.spec.ts`)
- **Contract tests:** Ensure every adapter passes `tests/contract/provider-contract.spec.ts`
