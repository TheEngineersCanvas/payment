# Project Memory: Current State

**Last updated:** 2026-07-21

---

## Current Sprint

v0.1.0-RC1 — Pre-release fixes and public API hardening

## Completed Features

- [x] Phase 1: Folder structure, type system, error hierarchy, branding types (Money, Currency, PaymentReference, Provider, Metadata), Result<T,E>, 15 error classes
- [x] Phase 2: Domain entities (Payment, PaymentStatus, PaymentAttempt, PaymentRequest, Customer, PaymentChannel), 9 domain events, 8 application ports, 4 use cases, PaymentService facade + stub refund/webhook services, full Paystack adapter with mapper and webhook parser, ProviderFactory registry, FetchHttpClient (timeout + retry), InMemoryEventBus, HmacWebhookVerifier, ConsoleLogger (redacting), createPaymentClient + fromEnv()
- [x] Phase 3: Refund domain (Refund, RefundStatus, RefundReason), 3 refund events, parseWebhook use case (rawBody+signature → WebhookEvent + emit webhook.received), refundPayment use case (paymentId+amount?+reason → Refund + emit refund.*), real WebhookService and RefundService replacing stubs, HmacWebhookVerifier accepts string|Buffer, real HMAC verifier wired per provider (stub removed), PaymentReference regex loosened, WebhookReceived gains eventId, webhook raw-body contract documented
- [x] Phase 4: ESLint with eslint-plugin-boundaries enforcing hexagonal layers, @vitest/coverage-v8 with thresholds, RefundService.fetch() with real Paystack GET /refund/:id, multi-provider webhook try-all routing, .npmignore, CHANGELOG.md, verify-build.sh + publish-checklist.sh scripts, examples (Next.js, Hono, Express), docs (extension-guide, provider-guide, migration-guide, versioning, performance, concurrency, api-stability, architecture), updated public-api.md, updated README.md
- [x] Phase 5 (v0.1.0-RC1): Fixed Paystack business error corruption in initialize/list/refund mappers; real timestamps in PaymentStatus discriminators (paidAt, failedAt, refundedAt); FetchHttpClient emits specialized error subclasses (ProviderRateLimitError etc.); public barrel now exports all documented types (Payment, PaymentStatus, Customer, PaymentRequest, HealthStatus, Page, ListQuery, etc.); Payment.id is undefined after initialize; metadata booleans forwarded; correlationId + Idempotency-Key support; user-supplied refund reference; webhook headers widened; public-api.spec.ts contract test; http-client-errors.spec.ts
- [x] NestJS adapter: PaymentModule (forRoot / forRootAsync), PaymentService injectable, WebhookController (opt-out), NestLoggerAdapter, RawBodyRequest type, JSDoc on all public exports, 18 tests (DI resolution, positive/negative webhook, subclass override), example under examples/nestjs/, subpath export `@tec/payment/nestjs`

## Current Feature

v0.1.0-RC1 — Pre-release hardening (COMPLETE)

## Next Planned Feature

v0.1.0 — Stable release (after RC1 validation)

## Known Blockers

None.

## Current Status

- **Build:** `tsup` produces clean ESM + CJS + .d.ts (no src/ leaks)
- **Types:** `tsc --noEmit` passes (0 errors)
- **Tests:** 98 unit/contract/integration tests pass (CI-safe), 104 total with Paystack sandbox
- **Lint:** ESLint passes (0 errors, 0 warnings) with boundary enforcement
- **Coverage:** `@vitest/coverage-v8` with thresholds (65% statements, 60% branches, 65% functions, 65% lines)
- **Dependencies:** Zero runtime dependencies, zero npm packages in `dependencies`
- **Docs:** 10 documentation files + 4 examples (Next.js Server Actions + Route Handler, Hono, Express, NestJS) + contract test for public API surface
- **Version:** 0.1.0-RC1
