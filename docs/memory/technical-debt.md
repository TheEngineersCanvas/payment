# Project Memory: Technical Debt

**Last updated:** 2026-07-15

---

## Current Debt

| # | Issue | Reason | Impact | Fix | Priority |
|---|-------|--------|--------|-----|----------|
| 1 | `Currency` branded union uses `(string & {})` | TypeScript idiom to prevent union collapse. May behave differently in TS 6.x. | Low — type is cosmetic; runtime accepts any string. | Replace with `Currency` namespace + type if TS removes this idiom. | Low |
| 2 | No eslint configuration | Skipped in Phase 1 to get skeleton building first. | No lint enforcement. | Add `eslint.config.js` with `@typescript-eslint` and `eslint-plugin-boundaries` in Phase 4. | Medium |
| 3 | No `.npmignore` | Dist files may include test fixtures or docs. | If `tests/` or `docs/` end up in the published tarball, it adds bulk. | Create `.npmignore` before first publish (Phase 4). | Medium |
| 4 | Error subclasses are structurally identical | Each error file repeats the same pattern (override code, category, httpStatus, isRetryable). ~12 files with nearly identical structure. | Code duplication across error files. | Extract a base helper or use a factory function. Not in v1 — errors are intentionally explicit. Revisit in v2. | Low |
| 5 | `Provider` type only lists `"paystack"` | No other providers exist yet. `(string & {})` catch-all accepts anything. | Nothing breaks — catch-all handles this. Adding a provider just means adding a literal. | Update when a second provider is implemented. | Low |
| 6 | `RefundService.fetch(id)` returns `InternalError("refund_fetch_not_implemented")` | Deferred to Phase 4 (not in v1 scope). | Code touching `refunds.fetch()` gets a runtime error with a clear message but no compile-time signal. | Add `fetch` use case in Phase 4. | Low |
| 7 | Multi-provider webhook routing not implemented | `WebhookService.receive()` always uses default provider. The `provider` field on input is optional and ignored. | Single-provider apps unaffected. Multi-provider apps need a custom webhook handler (route by header). | Implement provider-aware webhook routing in Phase 4. | Low |

## Resolved Debt (Phase 3)

| # | Issue | Resolution |
|---|-------|------------|
| — | `PaymentReference` regex too restrictive (blocks Paystack-valid chars like `.`, `=`, `,`) | Regex expanded from `^[a-zA-Z0-9_-]+$` to `^[A-Za-z0-9._=,+\-]{6,100}$` |
| — | `createPaymentClient` injected stub `webhookVerifier: { verify: () => false }` | Replaced with real `HmacWebhookVerifier(webhookSecret ?? secretKey, "sha512")` per provider |
| — | `WebhookReceived` domain event missing eventId | Added `eventId: string` field for app-side webhook deduplication |
