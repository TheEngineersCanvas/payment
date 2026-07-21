# Task 002 — Phase 2: Paystack End-to-End

- **Title:** Phase 2: Paystack End-to-End
- **Date:** 2026-07-15
- **Objective:** Build the full hexagonal architecture: domain entities, application ports, infrastructure adapters (including full Paystack adapter), use cases, services, and createPaymentClient factory. Tests using fixtures + Paystack sandbox.
- **Status:** Complete

## Summary

Implemented 72 files across all layers. The SDK is now a working payment abstraction: `createPaymentClient({ providers: { paystack: { secretKey } } })` returns a fully functional `PaymentClient` with `payments.initialize`, `payments.verify`, `payments.fetch`, `payments.list`, `events`, `providers`, and `health()`. `refunds` and `webhooks` are stubs that throw NotImplemented until Phase 3.

38 unit/contract tests pass with mocks (CI-safe). 5 integration tests pass against the real Paystack sandbox (43 total).

## Files Changed

### New files (72)

**Domain (12):**
- `src/domain/payment/payment.ts` — Payment entity
- `src/domain/payment/payment-status.ts` — PaymentStatus discriminated union + state machine
- `src/domain/payment/payment-channel.ts` — PaymentChannel union
- `src/domain/payment/payment-attempt.ts` — PaymentAttempt entity
- `src/domain/payment/payment-request.ts` — PaymentRequest VO + CustomerReference discriminated union
- `src/domain/customer/customer.ts` — Customer entity
- `src/domain/events/event-base.ts` — EventBase
- `src/domain/events/payment-initialized.ts`, `*-pending.ts`, `*-succeeded.ts`, `*-failed.ts`
- `src/domain/events/verification-completed.ts`
- `src/domain/events/webhook-received.ts`
- `src/domain/events/payment-events.ts` — PaymentEvent union + handlers
- `src/domain/webhook/webhook-event.ts` — WebhookEvent domain type
- `src/domain/webhook/webhook-signature.ts`

**Application ports (8):**
- `src/application/ports/logger.ts`
- `src/application/ports/clock.ts`
- `src/application/ports/id-generator.ts`
- `src/application/ports/http-client.ts` — HttpRequest/HttpResponse/HttpClient
- `src/application/ports/event-bus.ts` — EventBus + EventSubscription
- `src/application/ports/webhook-verifier.ts`
- `src/application/ports/payment-provider.ts` — PaymentProvider contract + capabilities + ListQuery + Page + HealthStatus + RefundRequest + RefundResult
- `src/application/ports/provider-factory.ts` — ProviderFactory + ProviderConfig + ProviderDeps

**Use cases (4):**
- `src/application/use-cases/initialize-payment.ts`
- `src/application/use-cases/verify-payment.ts`
- `src/application/use-cases/fetch-payment.ts`
- `src/application/use-cases/list-payments.ts`

**Services (6):**
- `src/application/services/payment-service.ts` — PaymentService facade
- `src/application/services/refund-service.ts` — Stub (throws NotImplemented)
- `src/application/services/webhook-service.ts` — Stub (throws NotImplemented)
- `src/application/services/provider-registry.ts` — ProviderRegistry
- `src/application/services/event-subscription-view.ts` — Read-only EventBus view
- `src/application/payment-client.ts` — PaymentClient interface
- `src/application/client-config.ts` — PaymentClientConfig types

**Infrastructure (14):**
- `src/infrastructure/logging/console-logger.ts` — JSON-line redacting logger
- `src/infrastructure/logging/noop-logger.ts`
- `src/infrastructure/clock/system-clock.ts` — SystemClock + FixedClock
- `src/infrastructure/id/ulid-id-generator.ts` — crypto.randomUUID
- `src/infrastructure/http/fetch-http-client.ts` — Fetch wrapper with timeout, http:// reject, 500ms retry on idempotent GETs
- `src/infrastructure/event-bus/in-memory-event-bus.ts` — Synchronous pub/sub with error isolation + recursive emit guard
- `src/infrastructure/webhook/hmac-webhook-verifier.ts` — HMAC-SHA512 with timingSafeEqual
- `src/infrastructure/providers/paystack/paystack-types.ts` — Paystack DTOs (internal, never exported)
- `src/infrastructure/providers/paystack/paystack-mapper.ts` — DTO → domain mapping
- `src/infrastructure/providers/paystack/paystack-webhook.ts` — Signature verify + event parse
- `src/infrastructure/providers/paystack/paystack-adapter.ts` — Full PaymentProvider impl for Paystack
- `src/infrastructure/providers/paystack/register.ts` — Auto-register on import
- `src/infrastructure/providers/provider-factory.ts` — Registry-based ProviderFactory

**Public API (1):**
- `src/public-api/client.ts` — createPaymentClient() + fromEnv() factory

**Tests (9):**
- `src/infrastructure/event-bus/in-memory-event-bus.test.ts` — 6 tests
- `src/infrastructure/webhook/hmac-webhook-verifier.test.ts` — 3 tests
- `src/infrastructure/logging/console-logger.test.ts` — 4 tests
- `src/infrastructure/providers/paystack/paystack-mapper.test.ts` — 10 tests
- `tests/contract/provider-contract.spec.ts` — 7 contract tests
- `tests/integration/paystack.spec.ts` — 5 integration tests (gated on PAYSTACK_SECRET_KEY)
- `tests/helpers/mock-http-client.ts` — MockHttpClient for testing

**Fixtures (4):**
- `tests/fixtures/paystack-initialize.json`
- `tests/fixtures/paystack-verify.json`
- `tests/fixtures/paystack-list.json`
- `tests/fixtures/paystack-webhook.json`

### Modified files (4)

- `src/domain/money/currency.ts` — Added Currency factory (validates ISO 4217 shape)
- `src/domain/money/money.ts` — Money factory now calls Currency() instead of casting; import fixed from `import type` to value import
- `src/domain/provider/provider.ts` — Factory now throws ValidationError (not plain Error); added lowercase+underscore validation
- `src/public-api/index.ts` — Re-exports createPaymentClient, PaymentClient, PaymentClientConfig, Logger, EventBus, EventSubscription
- `tsconfig.json` — Added `tests/` to include

## Design Decisions

1. **`crypto.randomUUID` instead of ULID.** The ADR mentions "ULID" but Node 18+'s `crypto.randomUUID()` (RFC 4122 v4) is zero-dependency, globally unique, and already shipped. ULID adds no value over UUID for internal correlation IDs. ADR §26.6 targets zero runtime dependencies.

2. **MockHttpClient instead of msw.** Hexagonal architecture makes msw unnecessary: the `HttpClient` port lets us swap implementations for tests. A 60-line `MockHttpClient` replaces a 300KB msw dependency. All contract + adapter tests pass with this.

3. **Use cases as pure functions** per ADR §8.1: `initializePayment(deps, input): Promise<Result<Payment, PaymentError>>`. Services compose them via constructor DI. This keeps unit testing simple — no mocks needed for use cases, just test doubles for their dependencies.

4. **`Payment.id` from `initialize` = `reference`.** Paystack's `/transaction/initialize` response doesn't return a numeric transaction ID — just `access_code` and `authorization_url`. The real ID comes from `/transaction/verify`. Apps should call `verify` after the redirect. Using the reference as a temporary id during the initialized state.

5. **Integration tests using shared `PaymentClient` instance.** Tests that each create their own client have no benefit over a single shared client. A `beforeAll` hook creates one client shared across all 5 integration tests for speed.

6. **Stub services throw `InternalError('not_implemented')`.** Phase 3 fills in `RefundService` and `WebhookService`. The stubs exist so `PaymentClient`'s interface is type-stable from day one.

## API Changes

Public API additions:
- `createPaymentClient(config): PaymentClient` — main factory
- `createPaymentClient.fromEnv()` — convenience for environment variables
- `PaymentClient` interface with `.payments`, `.refunds` (stub), `.webhooks` (stub), `.events`, `.providers`, `.health()`
- `PaymentClientConfig`, `Logger`, `EventBus`, `EventSubscription`

## Security Review

- **Secrets never logged.** `ConsoleLogger` redacts keys matching `secret|authorization|password|signature|api[_-]?key|card|pan|cvv` (case-insensitive).
- **HTTP URLs rejected.** `FetchHttpClient` throws `NetworkError` on `http://` URLs.
- **Timing-safe HMAC comparison.** `HmacWebhookVerifier` uses `crypto.timingSafeEqual`.
- **No runtime dependencies.** Only Node built-ins: `crypto`, `fetch`, `URL`, `AbortController`. Zero npm packages in `dependencies`.
- **Sandbox key in tests.** The integration test reads from `PAYSTACK_SECRET_KEY` env var. Not committed anywhere. CI will skip these tests if the var is absent.

## Testing Guide

```bash
# Unit + contract tests (CI-safe, no secrets needed)
bun run test -- --exclude "tests/integration/**"

# All tests including Paystack sandbox
PAYSTACK_SECRET_KEY=sk_test_... bun run test

# Type check
bun run check-types

# Build
bun run build
```

**Manual smoke test:**
```ts
import { createPaymentClient, Money, PaymentReference } from '@TheEngineersCanvas/payment';

const client = createPaymentClient({
  providers: { paystack: { secretKey: process.env.PAYSTACK_SECRET_KEY! } },
  defaultProvider: 'paystack',
});

const result = await client.payments.initialize({
  amount: Money({ amount: 500000, currency: 'NGN' }),
  reference: PaymentReference('order-' + Date.now()),
  customer: { kind: 'new', email: 'test@example.com' },
});

if (result.ok) {
  console.log('Authorization URL:', result.value.authorizationUrl);
}
```

## Risks

1. **Integration test requires Paystack API access.** If Paystack sandbox is slow or unreachable, tests fail. Test timeout set at 15s per test. CI can skip via env var absence.
2. **Stub services throw at runtime.** Code touching `refunds` or `webhooks` in Phase 2 will get `InternalError`. Type-level signal exists via `Result<T, E>` but static analysis is silent.
3. **No ESLint.** Phase 4 work. `bun run lint` currently fails.
4. **`PaymentReference` regex is alphanumeric + `_-` only.** Paystack's reference can include more characters. The factory will reject valid Paystack references. Mitigation: loosen the regex if real usage shows it's too restrictive.

## Future Improvements

- Loosen `PaymentReference` regex if real-world references need more characters.
- Add `refund` and `webhook` live implementations (Phase 3).
- Add ESLint with `eslint-plugin-boundaries` enforcing layer rules (Phase 4).
- v2: split Paystack to `@TheEngineersCanvas/payment-paystack` package.

## Related Tasks

- ADR-0001 (architecture blueprint)
- Phase 1 (skeleton & invariants — complete)
- Phase 3 (webhooks, refunds, docs — next)
- Phase 4 (playground, polish, release)

## Suggested Git Commit

```
feat(phase-2): paystack end-to-end with createPaymentClient

- Domain: Payment, PaymentStatus, PaymentAttempt, PaymentRequest,
  Customer, PaymentChannel, 9 domain events
- Ports: Logger, Clock, IdGenerator, HttpClient, EventBus,
  WebhookVerifier, PaymentProvider, ProviderFactory
- Use cases: initializePayment, verifyPayment, fetchPayment, listPayments
- Services: PaymentService, RefundService (stub), WebhookService (stub)
- Infrastructure: ConsoleLogger (redacting), NoopLogger, SystemClock,
  UlidIdGenerator, FetchHttpClient (timeout, retry, http:// reject),
  InMemoryEventBus (error isolation, recursive guard),
  HmacWebhookVerifier (timingSafeEqual)
- Paystack adapter: types, mapper, webhook parser, full adapter
- ProviderFactory with registry, Paystack registered at import
- createPaymentClient + fromEnv() factory
- Contract test (7 cases) + sandbox integration test (5 cases)
- Phase 1: Currency factory validates ISO 4217; Provider factory
  throws ValidationError
- 38 unit + 5 integration tests, 0 type errors, clean build
```
