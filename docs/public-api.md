# Public API

Complete public API reference for `@tec/payment`.

## createPaymentClient(config)

Factory function. Returns a `PaymentClient`.

```ts
import { createPaymentClient } from "@tec/payment";

const client = createPaymentClient({
  providers: {
    paystack: { secretKey: process.env.PAYSTACK_SECRET_KEY! },
  },
  defaultProvider: "paystack",
});
```

### PaymentClientConfig

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `providers` | `Record<Provider, ProviderConfig>` | Yes | Provider configurations keyed by provider name |
| `defaultProvider` | `Provider` | No | Default provider for operations. First configured provider if omitted |
| `logging` | `{ level: "debug" \| "info" \| "warn" \| "error" }` | No | Enables console logging at the given level |
| `http` | `HttpClientConfig` | No | Global HTTP client configuration |
| `eventBus` | `EventBus` | No | Custom event bus implementation |
| `clock` | `Clock` | No | Custom clock (for testing) |
| `idGenerator` | `IdGenerator` | No | Custom ID generator (for testing) |
| `logger` | `Logger` | No | Custom logger implementation |
| `httpClient` | `HttpClient` | No | Custom HTTP client implementation |

### ProviderConfig

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `secretKey` | `string` | Yes | Provider secret/API key |
| `publicKey` | `string` | No | Provider public key (if needed) |
| `webhookSecret` | `string` | No | Webhook signing secret. Defaults to `secretKey` |
| `baseUrl` | `string` | No | Override base URL (e.g., sandbox) |
| `timeoutMs` | `number` | No | Request timeout in ms (default: 30000) |
| `enabled` | `boolean` | No | Enable/disable provider (default: true) |

### fromEnv()

Environment variable convenience:

```ts
const client = createPaymentClient.fromEnv();

// Reads from:
// TEC_PAYMENT_DEFAULT_PROVIDER=paystack
// TEC_PAYMENT_PAYSTACK_SECRET_KEY=sk_...
// TEC_PAYMENT_PAYSTACK_WEBHOOK_SECRET=...
```

## PaymentClient

| Property | Type | Description |
|----------|------|-------------|
| `payments` | `PaymentService` | Initialize, verify, fetch, list payments |
| `refunds` | `RefundService` | Create and fetch refunds |
| `webhooks` | `WebhookService` | Receive and verify webhooks |
| `events` | `EventSubscription` | Subscribe to domain events |
| `providers` | `ProviderRegistry` | Introspect configured providers |
| `health()` | `Promise<HealthStatus[]>` | Health check all providers |

## PaymentService

```ts
interface PaymentService {
  initialize(req: PaymentRequest): Promise<Result<Payment, PaymentError>>;
  verify(ref: PaymentReference): Promise<Result<Payment, PaymentError>>;
  fetch(id: string): Promise<Result<Payment, PaymentError>>;
  list(query: ListQuery): Promise<Result<Page<Payment>, PaymentError>>;
}
```

### initialize(req)

```ts
const result = await client.payments.initialize({
  amount: Money({ amount: 500000, currency: "NGN" }),
  reference: PaymentReference("order-9001"),
  customer: { kind: "new", email: "customer@example.com" },
  callbackUrl: "https://myapp.com/verify",
});
```

Returns `Payment` with `authorizationUrl` for redirect-based flows.

### verify(reference)

```ts
const result = await client.payments.verify(PaymentReference("order-9001"));
```

Queries the provider API directly. Never trusts redirect query params.

### fetch(id)

```ts
const result = await client.payments.fetch("3811142484");
```

Looks up a payment by its provider-assigned ID.

### list(query)

```ts
const result = await client.payments.list({
  page: 1,
  perPage: 50,
  from: new Date("2026-01-01"),
  to: new Date("2026-01-31"),
});
```

Returns `Page<Payment>` with `{ items, total, page, perPage }`.

## RefundService

```ts
interface RefundService {
  create(input: RefundCreateInput): Promise<Result<Refund, PaymentError>>;
  fetch(id: string): Promise<Result<Refund, PaymentError>>;
}
```

### create(input)

```ts
// Full refund
const result = await client.refunds.create({
  paymentId: "3811142484",
  reason: "Customer requested refund",
});

// Partial refund
const result = await client.refunds.create({
  paymentId: "3811142484",
  amount: Money({ amount: 100000, currency: "NGN" }),
  reason: "Partial refund",
});
```

### fetch(id)

```ts
const result = await client.refunds.fetch("ref-500");
```

Returns the current `Refund` status. Requires provider support.

## WebhookService

```ts
interface WebhookService {
  receive(input: WebhookInput): Promise<Result<WebhookEvent, WebhookValidationError>>;
}
```

### receive(input)

```ts
const result = await client.webhooks.receive({
  rawBody: req.body,         // Buffer | string — must be exact bytes
  signature: req.headers["x-paystack-signature"],
  provider: "paystack",       // optional — auto-detected if omitted
});
```

The `rawBody` must be the exact bytes the provider POSTed. See `docs/security.md` for the raw body contract.

## EventSubscription

```ts
type Unsubscribe = () => void;

interface EventSubscription {
  on<T extends PaymentEventType>(type: T, handler: EventHandler<T>): Unsubscribe;
  onAny(handler: EventHandler): Unsubscribe;
}
```

### Events

| Event | Payload |
|-------|---------|
| `payment.initialized` | `{ type, payment, occurredAt, correlationId }` |
| `payment.pending` | `{ type, payment, occurredAt, correlationId }` |
| `payment.succeeded` | `{ type, payment, occurredAt, correlationId }` |
| `payment.failed` | `{ type, payment, occurredAt, correlationId }` |
| `verification.completed` | `{ type, payment, occurredAt, correlationId }` |
| `webhook.received` | `{ type, provider, eventId, eventType, originalType, payload, occurredAt, correlationId }` |
| `refund.initiated` | `{ type, refund, occurredAt, correlationId }` |
| `refund.succeeded` | `{ type, refund, occurredAt, correlationId }` |
| `refund.failed` | `{ type, refund, reason, occurredAt, correlationId }` |

```ts
client.events.on("payment.succeeded", (event) => {
  console.log(`Payment ${event.payment.reference} succeeded`);
});

client.events.on("payment.failed", (event) => {
  console.log(`Payment ${event.payment.reference} failed`);
});
```

## Types

### Payment

```ts
interface Payment {
  readonly id: string;
  readonly providerId: Provider;
  readonly reference: PaymentReference;
  readonly amount: Money;
  readonly status: PaymentStatus;
  readonly customer: Customer;
  readonly authorizationUrl?: string;
  readonly channel?: PaymentChannel;
  readonly attempts: ReadonlyArray<PaymentAttempt>;
  readonly metadata: Metadata;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly paidAt?: Date;
  readonly failureReason?: string;
}
```

### PaymentStatus

```ts
type PaymentStatus =
  | { kind: "initialized" }
  | { kind: "pending" }
  | { kind: "success"; paidAt: Date }
  | { kind: "failed"; reason: string; failedAt: Date }
  | { kind: "abandoned" }
  | { kind: "refunded"; refundedAt: Date; refundId: string };
```

### PaymentRequest

```ts
interface PaymentRequest {
  readonly amount: Money;
  readonly customer: CustomerReference;
  readonly reference: PaymentReference;
  readonly callbackUrl?: string;
  readonly channels?: ReadonlyArray<PaymentChannel>;
  readonly metadata?: Metadata;
  readonly expiresAt?: Date;
}

type CustomerReference =
  | { kind: "new"; email: string; phone?: string; name?: string }
  | { kind: "existing"; providerCustomerId: string };
```

### Refund

```ts
interface Refund {
  readonly id: string;
  readonly paymentId: string;
  readonly providerId: Provider;
  readonly amount: Money;
  readonly reason: string;
  readonly status: RefundStatus;
  readonly initiatedAt: Date;
  readonly completedAt?: Date;
  readonly failureReason?: string;
  readonly metadata: Metadata;
}
```

### RefundStatus

```ts
type RefundStatus =
  | { kind: "pending" }
  | { kind: "processing" }
  | { kind: "succeeded"; settledAt: Date }
  | { kind: "failed"; reason: string; failedAt: Date };
```

### WebhookEvent

```ts
interface WebhookEvent {
  readonly id: string;
  readonly provider: Provider;
  readonly type: string;
  readonly originalType: string;
  readonly createdAt: Date;
  readonly receivedAt: Date;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly raw: Readonly<Record<string, unknown>>;
}
```

### Result<T, E>

```ts
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// Constructors
function ok<T>(value: T): Result<T, never>;
function err<E>(error: E): Result<never, E>;
function attempt<T, E>(fn: () => T): Result<T, E>;
```

```ts
const result = await client.payments.initialize(req);

if (result.ok) {
  const payment = result.value;  // typed as Payment
} else {
  const error = result.error;    // typed as PaymentError
}
```

### Money

```ts
type MinorUnits = number & { readonly __brand: "MinorUnits" };

interface Money {
  readonly amount: MinorUnits;
  readonly currency: Currency;
}

// Factory
function Money(input: { amount: number; currency: string }): Money;
```

### PaymentReference

```ts
type PaymentReference = string & { readonly __brand: "PaymentReference" };

// Factory
function PaymentReference(value: string): PaymentReference;
```

### Provider

```ts
type Provider = string & { readonly __brand: "Provider" };

// Factory
function Provider(value: string): Provider;
```

### Currency

```ts
type Currency = string & { readonly __brand: "Currency" };

// Factory
function Currency(value: string): Currency;
```

### Metadata

```ts
type Metadata = Readonly<Record<string, string | number | boolean | null>>;
```

## Error Classes

All errors extend `PaymentError`:

| Error | HTTP | isRetryable | When |
|-------|------|-------------|------|
| `ConfigurationError` | — | No | Bad config at `createPaymentClient()` |
| `ValidationError` | 422 | No | Invalid input from app |
| `NetworkError` | 502 | Yes | HTTP failure, DNS, TLS |
| `TimeoutError` | 504 | Yes | Request timed out |
| `ProviderUnavailableError` | 502 | Yes | Provider 5xx after retries |
| `ProviderBadRequestError` | 400 | No | Provider 400 |
| `ProviderUnauthorizedError` | 401 | No | Provider 401/403 |
| `ProviderNotFoundError` | 404 | No | Provider 404 |
| `ProviderConflictError` | 409 | No | Provider 409 |
| `ProviderRateLimitError` | 429 | Yes | Provider 429 |
| `VerificationError` | 502 | Yes | Verification API call failed |
| `WebhookValidationError` | 401 | No | Invalid signature or body |
| `RefundError` | 400 | No | Refund rejected by provider |
| `InternalError` | 500 | No | SDK bug — report it |

## Health

```ts
const health = await client.health();
// [{ healthy: true, latencyMs: 45, timestamp: Date }]
```
