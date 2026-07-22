# Project Memory: Current State

**Last updated:** 2026-07-22

---

## Current Sprint

v0.1.0-RC5 — Phase 6.3: DX improvements (mock client, throttler docs, testing guide)

## Completed Features

- [x] Phase 1–5: Foundation, Paystack adapter, refunds, quality hardening, NestJS adapter
- [x] Phase 6.1 (v0.1.0-RC3): Payment.fees, Payment.netAmount, Payment.accessCode; correlation IDs; fromEnv() provider-native fallback; NestJS webhookPath + logging
- [x] Phase 6.2 (v0.1.0-RC4): Transfers domain — Transfer, TransferRecipient, TransferStatus, BankCode; 4 transfer events; 6 use cases; TransferService; Paystack adapter; webhook mapper fix; 17 new tests
- [x] Phase 6.3 (v0.1.0-RC5): MockHttpClient + createMockClient() exported for consumer integration testing; NestJS throttler example (examples/nestjs/throttled-webhook.ts); README testing section + throttler docs; migration-guide.md "Testing with Mocks" section; contract test updated

## Current Feature

Phase 6.3 — DX improvements (COMPLETE)

## Next Planned Feature

v0.1.0 — Stable release

## Known Blockers

None.

## Current Status

- **Build:** `tsup` produces clean ESM + CJS + .d.ts (no src/ leaks)
- **Types:** `tsc --noEmit` passes (0 errors)
- **Tests:** 138 unit/contract/integration tests pass (CI-safe)
- **Lint:** ESLint passes (0 errors, 0 warnings) with boundary enforcement
- **Coverage:** `@vitest/coverage-v8` with thresholds (65% statements, 60% branches, 65% functions, 65% lines)
- **Dependencies:** Zero runtime dependencies, zero npm packages in `dependencies`
- **Docs:** 10 documentation files + 5 examples + contract test for public API surface
- **Version:** 0.1.0-RC5
