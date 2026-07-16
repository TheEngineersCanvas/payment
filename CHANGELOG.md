# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-RC1] — 2026-07-16

### Fixed

- **CRITICAL:** Public barrel now re-exports all documented types (`Payment`, `PaymentStatus`, `Customer`, `PaymentRequest`, `HealthStatus`, `Page`, `ListQuery`, `RefundRequest`, `RefundResult`, `WebhookEvent`, `ProviderCapabilities`, `PaymentChannel`, `PaymentAttempt`, `CustomerReference`, `EventHandler`, `Unsubscribe`, `PaymentEventType`, `PaymentEvent`, all event subtypes, `HttpClient`, `HttpRequest`, `HttpResponse`, `Clock`, `IdGenerator`). Previously, TypeScript consumers could not import these types without accessing internal paths.
- **CRITICAL:** Paystack business errors (e.g., "Duplicate transaction reference") are no longer silently corrupted into "Cannot read properties of null". `mapInitializeResponse`, `mapPaystackListResponse`, and `mapPaystackRefundResponse` now throw a `ProviderError` carrying Paystack's actual `message` when `response.status` is `false`.
- **CRITICAL:** Payment status discriminators (`paidAt`, `failedAt`, `refundedAt`) now use real Paystack timestamps instead of `new Date()` (the time of mapping). `mapPaystackStatus` now takes the transaction data and derives timestamps from `paid_at`, `updated_at`, and `created_at` fields.
- **CRITICAL:** `FetchHttpClient` now emits `ProviderBadRequestError` (400), `ProviderUnauthorizedError` (401/403), `ProviderNotFoundError` (404), `ProviderConflictError` (409), and `ProviderRateLimitError` (429) instead of generic `ProviderError`. `instanceof ProviderRateLimitError` now works in user code.
- **CRITICAL:** Metadata booleans are no longer silently dropped before sending to Paystack.
- **CRITICAL:** `Payment.id` is now `undefined` after `initialize()`; only populated by `verify()`/`fetch()` with the actual Paystack numeric transaction ID. `Payment.reference` remains the stable lifecycle lookup key.

- **Webhook headers:** `WebhookInput.headers` now accepts `Record<string, string | readonly string[] | undefined>` (the actual Express type). Array values are joined with `", "` before being passed to the provider.
- **Correlation ID:** Every HTTP request now includes an `X-TEC-Correlation-Id` header carrying the per-call correlation ID for observability.
- **Idempotency key:** `PaymentRequest` and `RefundCreateInput` now accept an optional `idempotencyKey` field, forwarded as the `Idempotency-Key` HTTP header.
- **Refund reference:** `RefundCreateInput` now accepts an optional user-supplied `reference` for idempotent refund control. Falls back to a generated ID if not provided.
- **`fetchRefund` use case** now uses the injected `Clock` port instead of an inline `new Date()`.
- **`refundPayment` use case** now returns `ok(refund)` instead of a type-cast.

### Added

- `tests/contract/public-api.spec.ts`: contract test that verifies all types in `docs/public-api.md` are actually exported from the public barrel.
- `tests/unit/http-client-errors.spec.ts`: tests HTTP status → error subclass mapping.
- New mapper tests for `status: false` guards, timestamp accuracy, and `Payment.id` after initialize.

## [0.1.0] — Unreleased

### Added

- Initial release with Paystack provider support
- `createPaymentClient()` factory and `fromEnv()` convenience
- Payment lifecycle: initialize, verify, fetch, list
- Webhook reception with HMAC-SHA512 signature verification and multi-provider try-all routing
- Full and partial refunds with `create()` and `fetch()`
- Domain event system (9 event types) with in-process pub/sub
- 14 error classes with typed `Result<T, E>` discriminated unions
- Branded primitives: `Money`, `PaymentReference`, `Provider`, `Currency`, `Metadata`
- Framework-agnostic: tested with Next.js, Hono, Express snippets
- Zero runtime dependencies
- Node 18+ and Bun support
- ESLint with architectural boundary enforcement
- Code coverage reporting with vitest
