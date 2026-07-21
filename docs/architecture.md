# Architecture

`@TheEngineersCanvas/payment` follows **Hexagonal Architecture** (Ports & Adapters) combined with **Domain-Driven Design** tactical patterns.

## Layers

```
┌────────────────────────────────────────────────────────────┐
│                  APPLICATION CODE                          │
│         (Next.js, NestJS, Hono, Express, Worker)           │
└────────────────────────┬───────────────────────────────────┘
                         │  imports
                         ▼
┌────────────────────────────────────────────────────────────┐
│              @TheEngineersCanvas/payment  (public API)                    │
│   createPaymentClient(config) → PaymentClient             │
└────────────────────────┬───────────────────────────────────┘
                         │
        ┌────────────────┼─────────────────┐
        ▼                ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌────────────────────┐
│  Application │  │    Domain    │  │   Infrastructure   │
│    Layer     │◄┤    Layer     │─►│       Layer        │
│              │  │ (pure TS)    │  │  (HTTP, providers) │
│  Use cases   │  │  Entities    │  │  Adapters, ports   │
│  Orchestr.   │  │  VOs, events │  │  impls             │
└──────────────┘  └──────────────┘  └────────────────────┘
        ▲                ▲                 ▲
        └────────────────┴─────────────────┘
            Dependency Inversion: domain knows no infra
```

### `src/domain/` — Pure TypeScript

- No I/O, no framework imports
- Entities: `Payment`, `Refund`, `Customer`
- Value objects: `Money`, `Currency`, `PaymentReference`, `Provider`, `Metadata`
- State machines: `PaymentStatus`, `RefundStatus` (discriminated unions)
- Domain events: `PaymentInitialized`, `PaymentSucceeded`, `RefundInitiated`, etc.

### `src/application/` — Use Cases & Ports

- **Ports** (interfaces): `PaymentProvider`, `HttpClient`, `Logger`, `Clock`, `IdGenerator`, `EventBus`, `WebhookVerifier`
- **Use cases** (pure functions): `initializePayment`, `verifyPayment`, `refundPayment`, `parseWebhook`, etc.
- **Services** (facades): `PaymentService`, `RefundService`, `WebhookService`

### `src/infrastructure/` — Adapters

- Paystack adapter (the only v1 provider)
- `FetchHttpClient` — native `fetch()` wrapper
- `InMemoryEventBus` — synchronous pub/sub
- `HmacWebhookVerifier` — HMAC-SHA512 with `timingSafeEqual`
- `ConsoleLogger` — JSON-line output with secret redaction

### `src/public-api/` — Firewall

The **only** layer visible to consumers. Everything else is internal and may change without notice.

## Dependency Rules

Enforced by ESLint (`eslint-plugin-boundaries`):

| Layer | May import from |
|-------|----------------|
| `domain` | `domain`, `shared`, `errors` |
| `application` | `application`, `domain`, `shared`, `errors` |
| `infrastructure` | `infrastructure`, `application`, `domain`, `shared`, `errors` |
| `public-api` | Everything |

## Key Design Decisions

1. **Stateless SDK.** No database, no connection pool, no mutable state. Apps own persistence.
2. **Provider ignorance.** Application code never imports a provider directly. `PaymentProvider` is a port.
3. **Result-over-throw.** Expected failures return `Result<T, E>`. Only programmer errors throw.
4. **Branded primitives.** `Money`, `PaymentReference`, `Provider` are branded types validated at construction.
5. **Money in minor units.** Always kobo/cents. Major unit display is a UI concern.
6. **App-owned references.** The SDK never generates payment references. Idempotency is controllable by the app.
7. **Webhook raw body is mandatory.** Signature verification requires exact bytes from the HTTP request.

## Folder Structure

```
src/
├── public-api/         # Only layer visible to consumers
├── domain/             # Pure TS — no I/O
│   ├── money/          # Money, Currency
│   ├── payment/        # Payment, PaymentStatus, PaymentRequest
│   ├── refund/         # Refund, RefundStatus, RefundReason
│   ├── customer/       # Customer
│   ├── provider/       # Provider branded type
│   ├── reference/      # PaymentReference branded type
│   ├── metadata/       # Metadata branded type
│   ├── webhook/        # WebhookEvent
│   └── events/         # Domain events (9 types)
├── application/        # Use cases, services, ports
│   ├── ports/          # Interfaces (8 ports)
│   ├── use-cases/      # Pure functions (7 use cases)
│   └── services/       # Facades (5 services)
├── infrastructure/     # Adapter implementations
│   ├── providers/      # Provider adapters (Paystack)
│   ├── http/           # FetchHttpClient
│   ├── event-bus/      # InMemoryEventBus
│   ├── webhook/        # HmacWebhookVerifier
│   ├── logging/        # ConsoleLogger, NoopLogger
│   ├── clock/          # SystemClock
│   └── id/             # UlidIdGenerator
├── errors/             # Error hierarchy (15 classes)
└── shared/             # Result<T, E>, brand type
```

## Testing Strategy

3-tier testing pyramid:

1. **Unit tests** — Co-located with source (`*.test.ts`). Test use cases, domain objects, infrastructure components in isolation.
2. **Contract tests** — `tests/contract/provider-contract.spec.ts`. Every provider adapter must pass the same contract. Uses `MockHttpClient`.
3. **Integration tests** — `tests/integration/`. End-to-end against Paystack sandbox (gated on `PAYSTACK_SECRET_KEY`). In-process HTTP server for webhook E2E.
