# Project Memory: Current State

**Last updated:** 2026-07-22

---

## Current Sprint

v0.1.0-RC4 — Phase 6.2: Transfers domain

## Completed Features

- [x] Phase 1: Folder structure, type system, error hierarchy, branding types (Money, Currency, PaymentReference, Provider, Metadata), Result<T,E>, 15 error classes
- [x] Phase 2: Domain entities (Payment, PaymentStatus, PaymentAttempt, PaymentRequest, Customer, PaymentChannel), 9 domain events, 8 application ports, 4 use cases, PaymentService facade + stub refund/webhook services, full Paystack adapter with mapper and webhook parser, ProviderFactory registry, FetchHttpClient (timeout + retry), InMemoryEventBus, HmacWebhookVerifier, ConsoleLogger (redacting), createPaymentClient + fromEnv()
- [x] Phase 3: Refund domain (Refund, RefundStatus, RefundReason), 3 refund events, parseWebhook use case (rawBody+signature → WebhookEvent + emit webhook.received), refundPayment use case (paymentId+amount?+reason → Refund + emit refund.*), real WebhookService and RefundService replacing stubs, HmacWebhookVerifier accepts string|Buffer, real HMAC verifier wired per provider (stub removed), PaymentReference regex loosened, WebhookReceived gains eventId, webhook raw-body contract documented
- [x] Phase 4: ESLint with eslint-plugin-boundaries enforcing hexagonal layers, @vitest/coverage-v8 with thresholds, RefundService.fetch() with real Paystack GET /refund/:id, multi-provider webhook try-all routing, .npmignore, CHANGELOG.md, verify-build.sh + publish-checklist.sh scripts, examples (Next.js, Hono, Express), docs (extension-guide, provider-guide, migration-guide, versioning, performance, concurrency, api-stability, architecture), updated public-api.md, updated README.md
- [x] Phase 5 (v0.1.0-RC1): Fixed Paystack business error corruption in initialize/list/refund mappers; real timestamps in PaymentStatus discriminators (paidAt, failedAt, refundedAt); FetchHttpClient emits specialized error subclasses (ProviderRateLimitError etc.); public barrel now exports all documented types (Payment, PaymentStatus, Customer, PaymentRequest, HealthStatus, Page, ListQuery, etc.); Payment.id is undefined after initialize; metadata booleans forwarded; correlationId + Idempotency-Key support; user-supplied refund reference; webhook headers widened; public-api.spec.ts contract test; http-client-errors.spec.ts
- [x] NestJS adapter: PaymentModule (forRoot / forRootAsync), PaymentService injectable, WebhookController (opt-out), NestLoggerAdapter, RawBodyRequest type, JSDoc on all public exports, 18 tests (DI resolution, positive/negative webhook, subclass override), example under examples/nestjs/, subpath export `@TheEngineersCanvas/payment/nestjs`
- [x] Phase 6.1 (v0.1.0-RC3): Payment.fees, Payment.netAmount, Payment.accessCode; PaymentRequest.correlationId; RefundCreateInput.correlationId; RefundRequest.correlationId; Paystack mapper surfaces access_code, fees, netAmount; Paystack adapter honors request-level correlationId; fromEnv() falls back to provider-native env vars (PAYSTACK_SECRET_KEY, etc.); NestJS webhookPath + webhook logging (debug/warn); docs/public-api.md updated; contract test + mapper test updated
- [x] Phase 6.2 (v0.1.0-RC4): Transfers domain: Transfer, TransferStatus, TransferRecipient, BankCode; 4 transfer events (TransferInitiated, TransferSucceeded, TransferFailed, TransferReversed); PaymentProvider extended with listBankCodes, resolveAccount, createRecipient, initiateTransfer, fetchTransfer, listTransfers; ProviderCapabilities gains supportsTransfers + supportedTransferCurrencies; TransferService facade via client.transfers; Paystack transfer mapper + adapter methods; webhook mapper fixed (transfer.* → transfer.succeeded|failed|reversed); 10 mapper tests + 4 use-case tests + 3 webhook tests + contract test updates; public-api.md and README.md updated

## Current Feature

Phase 6.2 — Transfers domain (COMPLETE)

## Next Planned Feature

Phase 6.3 — DX improvements (mock clients, throttler docs)

## Known Blockers

None.

## Current Status

- **Build:** `tsup` produces clean ESM + CJS + .d.ts (no src/ leaks)
- **Types:** `tsc --noEmit` passes (0 errors)
- **Tests:** 137 unit/contract/integration tests pass (CI-safe)
- **Lint:** ESLint passes (0 errors, 0 warnings) with boundary enforcement
- **Coverage:** `@vitest/coverage-v8` with thresholds (65% statements, 60% branches, 65% functions, 65% lines)
- **Dependencies:** Zero runtime dependencies, zero npm packages in `dependencies`
- **Docs:** 10 documentation files + 4 examples + contract test for public API surface
- **Version:** 0.1.0-RC4
