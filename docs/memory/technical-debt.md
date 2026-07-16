# Project Memory: Technical Debt

**Last updated:** 2026-07-16

---

## Current Debt

| # | Issue | Reason | Impact | Fix | Priority |
|---|-------|--------|--------|-----|----------|
| 1 | `Currency` branded union uses `(string & {})` | TypeScript idiom to prevent union collapse. May behave differently in TS 6.x. | Low — type is cosmetic; runtime accepts any string. | Replace with `Currency` namespace + type if TS removes this idiom. | Low |
| 2 | Error subclasses are structurally identical | Each error file repeats the same pattern (override code, category, httpStatus, isRetryable). ~12 files with nearly identical structure. | Code duplication across error files. | Extract a base helper or use a factory function. Not in v1 — errors are intentionally explicit. Revisit in v2. | Low |
| 3 | `Provider` type only lists `"paystack"` | No other providers exist yet. `(string & {})` catch-all accepts anything. | Nothing breaks — catch-all handles this. Adding a provider just means adding a literal. | Update when a second provider is implemented. | Low |
| 4 | Use cases not individually unit tested | Contract tests exercise code through the adapter boundary but coverage tool doesn't credit use case files. Four use cases at 0% coverage (fetch, initialize, list, verify). | False negative in coverage — code is tested through contract/integration tests. | Add unit tests for each use case or configure coverage to account for contract tests. | Low |
| 5 | `HmacWebhookVerifier` always uses "sha512" | Paystack uses SHA-512. Stripe uses SHA-256. | No impact while Paystack is the only provider. | Make algorithm configurable in the constructor or per-provider config. | Low |

## Resolved Debt (Phase 4)

| # | Issue | Resolution |
|---|-------|------------|
| 2 | No eslint configuration | Added `eslint.config.js` with @typescript-eslint and eslint-plugin-boundaries enforcing hexagonal layer rules |
| 3 | No `.npmignore` | Created `.npmignore` with comprehensive exclusions |
| 6 | `RefundService.fetch(id)` returns `InternalError` | Implemented real `fetch-refund.ts` use case + Paystack adapter `fetchRefund()` method via `GET /refund/:id` |
| 7 | Multi-provider webhook routing not implemented | Implemented try-all routing: iterate all providers, first signature match wins. Explicit `provider` field also supported |

## Resolved Debt (Phase 3)

| # | Issue | Resolution |
|---|-------|------------|
| — | `PaymentReference` regex too restrictive (blocks Paystack-valid chars like `.`, `=`, `,`) | Regex expanded from `^[a-zA-Z0-9_-]+$` to `^[A-Za-z0-9._=,+\-]{6,100}$` |
| — | `createPaymentClient` injected stub `webhookVerifier: { verify: () => false }` | Replaced with real `HmacWebhookVerifier(webhookSecret ?? secretKey, "sha512")` per provider |
| — | `WebhookReceived` domain event missing eventId | Added `eventId: string` field for app-side webhook deduplication |
