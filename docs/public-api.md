# Public API

> **Status:** Phase 3 (in progress). Full documentation planned for Phase 4.

## createPaymentClient(config)

Factory function. Returns a `PaymentClient`.

```ts
import { createPaymentClient } from "@tec/payment";

const client = createPaymentClient({
  providers: { paystack: { secretKey: "sk_..." } },
  defaultProvider: "paystack",
});
```

## PaymentClient

| Property | Type | Description |
|----------|------|-------------|
| `payments` | `PaymentService` | Initialize, verify, fetch, list payments |
| `refunds` | `RefundService` | Create refunds |
| `webhooks` | `WebhookService` | Receive and verify webhooks |
| `events` | `EventSubscription` | Subscribe to domain events |
| `providers` | `ProviderRegistry` | Introspect configured providers |
| `health()` | `Promise<HealthStatus[]>` | Health check all providers |

## PaymentService

- `payments.initialize(req: PaymentRequest): Promise<Result<Payment, PaymentError>>`
- `payments.verify(ref: PaymentReference): Promise<Result<Payment, PaymentError>>`
- `payments.fetch(id: string): Promise<Result<Payment, PaymentError>>`
- `payments.list(query: ListQuery): Promise<Result<Page<Payment>, PaymentError>>`

## RefundService

- `refunds.create(input: RefundCreateInput): Promise<Result<Refund, PaymentError>>`
- `refunds.fetch(id: string): Promise<Result<unknown, PaymentError>>` (not yet implemented)

## WebhookService

- `webhooks.receive(input: WebhookInput): Promise<Result<WebhookEvent, WebhookValidationError>>`

The `WebhookInput.rawBody` must be the exact bytes the provider POSTed. See `docs/security.md` for the raw body contract.

## Events

Events are emitted on the `EventBus`. Subscribe via `client.events.on(type, handler)`:

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

## Types

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
