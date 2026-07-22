# Public API

Complete public API reference for `@TheEngineersCanvas/payment`.

## createPaymentClient(config)

Factory function. Returns a `PaymentClient`.

```ts
import { createPaymentClient } from "@TheEngineersCanvas/payment";

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

// Checks in order:
// 1. TEC_PAYMENT_* namespace (explicit)
// 2. Provider-native variables (e.g., PAYSTACK_SECRET_KEY)

// Reads from:
// TEC_PAYMENT_DEFAULT_PROVIDER=paystack  (or PAYSTACK_* for provider config)
// TEC_PAYMENT_PAYSTACK_SECRET_KEY=sk_... (or PAYSTACK_SECRET_KEY)
// TEC_PAYMENT_PAYSTACK_WEBHOOK_SECRET=... (or PAYSTACK_WEBHOOK_SECRET)
// TEC_PAYMENT_PAYSTACK_BASE_URL=...      (or PAYSTACK_BASE_URL)
// TEC_PAYMENT_LOGGING_LEVEL=debug|info|warn|error
```

## PaymentClient

| Property | Type | Description |
|----------|------|-------------|
| `payments` | `PaymentService` | Initialize, verify, fetch, list payments |
| `refunds` | `RefundService` | Create and fetch refunds |
| `transfers` | `TransferService` | List bank codes, resolve accounts, create recipients, initiate/fetch/list transfers |
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

## TransferService

```ts
interface TransferService {
  listBankCodes(currency: Currency): Promise<Result<ReadonlyArray<BankCode>, PaymentError>>;
  resolveAccount(input: { accountNumber: string; bankCode: string; currency: Currency }): Promise<Result<ResolveAccountResult, PaymentError>>;
  createRecipient(input: CreateRecipientInput): Promise<Result<TransferRecipient, PaymentError>>;
  initiate(input: InitiateTransferInput): Promise<Result<Transfer, PaymentError>>;
  fetch(id: string): Promise<Result<Transfer, PaymentError>>;
  list(query: ListQuery): Promise<Result<Page<Transfer>, PaymentError>>;
}
```

### listBankCodes(currency)

```ts
const result = await client.transfers.listBankCodes(Currency("NGN"));
// returns BankCode[]: [{ code: "044", name: "Access Bank", currency: "NGN" }, ...]
```

Requires `ProviderCapabilities.supportsTransfers` to be true and the currency to be in `supportedTransferCurrencies`.

### resolveAccount(input)

```ts
const result = await client.transfers.resolveAccount({
  accountNumber: "0123456789",
  bankCode: "044",
  currency: Currency("NGN"),
});
// returns { accountName: "JOHN DOE" }
```

### createRecipient(input)

```ts
const result = await client.transfers.createRecipient({
  name: "John Doe",
  accountNumber: "0123456789",
  bankCode: "044",
  currency: Currency("NGN"),
});
// returns TransferRecipient with recipient.code
```

### initiate(input)

```ts
const result = await client.transfers.initiate({
  amount: Money({ amount: 1000000, currency: "NGN" }),
  recipientCode: "RCP_abc123",
  reference: "payout-001",
  reason: "Monthly payout",
  currency: Currency("NGN"),
});
// returns Transfer with status
```

Emits `transfer.initiated` (pending/processing) or `transfer.failed` events. Accepts `correlationId` and `idempotencyKey`.

### fetch(id)

```ts
const result = await client.transfers.fetch("500");
// returns Transfer
```

### list(query)

```ts
const result = await client.transfers.list({ page: 1, perPage: 50 });
// returns Page<Transfer>
```

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
| `transfer.initiated` | `{ type, transfer, occurredAt, correlationId }` |
| `transfer.succeeded` | `{ type, transfer, occurredAt, correlationId }` |
| `transfer.failed` | `{ type, transfer, reason, occurredAt, correlationId }` |
| `transfer.reversed` | `{ type, transfer, occurredAt, correlationId }` |

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
  readonly id?: string;
  readonly providerId: Provider;
  readonly reference: PaymentReference;
  readonly amount: Money;
  readonly fees?: Money;
  readonly netAmount?: Money;
  readonly status: PaymentStatus;
  readonly customer: Customer;
  readonly authorizationUrl?: string;
  readonly accessCode?: string;
  readonly channel?: PaymentChannel;
  readonly attempts: ReadonlyArray<PaymentAttempt>;
  readonly metadata: Metadata;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly paidAt?: Date;
  readonly failureReason?: string;
}
```

`id` is the provider-assigned numeric ID. It is `undefined` after `initialize()` and only populated by `verify()` / `fetch()`. Use `reference` as the stable lifecycle lookup key.

- `fees` and `netAmount` are the provider-charged fee and net settlement amount (`amount - fees`). Available from `verify()` / `fetch()` / `list()` for successful transactions; `undefined` after `initialize()` and for non-successful statuses.
- `accessCode` is the provider-issued access code (e.g., Paystack `access_code`). Available after `initialize()`; `undefined` for verified/fetched transactions.

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
  readonly idempotencyKey?: string;
  readonly correlationId?: string;
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

### Customer

```ts
interface Customer {
  readonly id: string;
  readonly email: string;
  readonly phone?: string;
  readonly name?: string;
  readonly metadata?: Metadata;
}
```

### PaymentChannel

```ts
type PaymentChannel = "card" | "bank" | "ussd" | "qr" | "mobile_money" | "bank_transfer" | (string & {});
```

### PaymentAttempt

```ts
interface PaymentAttempt {
  readonly id: string;
  readonly status: PaymentStatus;
  readonly channel: PaymentChannel;
  readonly ipAddress?: string;
  readonly fees?: Money;
  readonly authorizationCode?: string;
  readonly bin?: string;
  readonly last4?: string;
  readonly bank?: string;
  readonly attemptedAt: Date;
}
```

### HealthStatus

```ts
interface HealthStatus {
  readonly healthy: boolean;
  readonly latencyMs: number;
  readonly timestamp: Date;
}
```

### Page\<T\>

```ts
interface Page<T> {
  readonly items: ReadonlyArray<T>;
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
}
```

### ListQuery

```ts
interface ListQuery {
  readonly page?: number;
  readonly perPage?: number;
  readonly from?: Date;
  readonly to?: Date;
  readonly status?: string;
  readonly customer?: string;
}
```

### ProviderCapabilities

```ts
interface ProviderCapabilities {
  readonly supportsAuthorizationUrl: boolean;
  readonly supportsRecurring: boolean;
  readonly supportsPartialRefund: boolean;
  readonly supportsWebhooks: boolean;
  readonly supportsTransfers: boolean;
  readonly maxAmount?: Money;
  readonly supportedCurrencies: ReadonlyArray<Currency>;
  readonly supportedChannels: ReadonlyArray<PaymentChannel>;
  readonly supportedTransferCurrencies: ReadonlyArray<Currency>;
}
```

### RefundRequest

```ts
interface RefundRequest {
  readonly paymentId: string;
  readonly amount?: number;
  readonly reason: string;
  readonly reference: string;
  readonly idempotencyKey?: string;
  readonly correlationId?: string;
}
```

### RefundResult

```ts
interface RefundResult {
  readonly id: string;
  readonly paymentId: string;
  readonly amount: Money;
  readonly status: "pending" | "processing" | "succeeded" | "failed";
  readonly reason: string;
  readonly reference: string;
  readonly createdAt: Date;
  readonly completedAt?: Date;
}
```

### WebhookInput

```ts
interface WebhookInput {
  readonly provider?: string;
  readonly rawBody: string | Buffer;
  readonly signature: string;
  readonly headers?: Readonly<Record<string, string | readonly string[] | undefined>>;
}
```

### RefundCreateInput

```ts
interface RefundCreateInput {
  readonly paymentId: string;
  readonly amount?: Money;
  readonly reason: string;
  readonly reference?: string;
  readonly idempotencyKey?: string;
  readonly metadata?: Metadata;
  readonly correlationId?: string;
}
```

### Transfer

```ts
interface Transfer {
  readonly id: string;
  readonly providerId: Provider;
  readonly amount: Money;
  readonly recipient: TransferRecipient;
  readonly status: TransferStatus;
  readonly reference: string;
  readonly reason?: string;
  readonly createdAt: Date;
  readonly completedAt?: Date;
  readonly failureReason?: string;
  readonly metadata: Metadata;
}
```

### TransferStatus

```ts
type TransferStatus =
  | { readonly kind: "pending" }
  | { readonly kind: "processing" }
  | { readonly kind: "succeeded"; readonly settledAt: Date }
  | { readonly kind: "failed"; readonly reason: string; readonly failedAt: Date }
  | { readonly kind: "reversed"; readonly reversedAt: Date };
```

`isFinalTransferStatus(status)` returns `true` for `succeeded`, `failed`, and `reversed`.

### TransferRecipient

```ts
interface TransferRecipient {
  readonly code: string;
  readonly name: string;
  readonly accountNumber: string;
  readonly bankCode: string;
  readonly currency: Currency;
  readonly createdAt: Date;
  readonly metadata: Metadata;
}
```

### BankCode

```ts
interface BankCode {
  readonly code: string;
  readonly name: string;
  readonly currency: Currency;
}
```

### CreateRecipientInput

```ts
interface CreateRecipientInput {
  readonly name: string;
  readonly accountNumber: string;
  readonly bankCode: string;
  readonly currency: Currency;
  readonly metadata?: Metadata;
}
```

### InitiateTransferInput

```ts
interface InitiateTransferInput {
  readonly amount: Money;
  readonly recipientCode: string;
  readonly reference: string;
  readonly reason?: string;
  readonly currency: Currency;
  readonly correlationId?: string;
  readonly idempotencyKey?: string;
  readonly metadata?: Metadata;
}
```

### ResolveAccountResult

```ts
interface ResolveAccountResult {
  readonly accountName: string;
}
```

### HttpClient / HttpRequest / HttpResponse

```ts
interface HttpClient {
  send(request: HttpRequest): Promise<Result<HttpResponse, PaymentError>>;
}

interface HttpRequest {
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly timeoutMs?: number;
  readonly isRetryable?: boolean;
  readonly correlationId?: string;
  readonly idempotencyKey?: string;
}

interface HttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}
```

### Clock / IdGenerator

```ts
interface Clock {
  now(): Date;
}

interface IdGenerator {
  generate(): string;
}
```

### EventHandler / Unsubscribe

```ts
type EventHandler<T extends PaymentEventType = PaymentEventType> = (
  event: Extract<PaymentEvent, { type: T }>,
) => void | Promise<void>;

type Unsubscribe = () => void;
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
