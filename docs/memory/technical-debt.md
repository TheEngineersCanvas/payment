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
| 6 | `UlidIdGenerator` generates UUIDs, not ULIDs | Uses `randomUUID()` instead of a real ULID algorithm. | Minor — correlationId format differs from the class name. Consumers expecting sortable ULIDs get UUID v4. | Rename to `RandomIdGenerator` or implement real ULID. | Low |
| 7 | `Object.freeze` on `attempts` and `metadata` is shallow | Only the array/object reference is frozen; items inside can still be mutated. | Low — violation of `Readonly` contract if consumer mutates items. | Deep-freeze in v2. | Low |
| 8 | `RefundService.fetch` is unconditional but `fetchRefund?` is optional in the port | Non-Paystack providers get `InternalError("Provider does not support fetching individual refunds")`. | Medium — v2 provider authors forced to implement or break API. | Make mandatory or add a `capabilities.fetchRefund` flag. | Medium |

## Resolved Debt (v0.1.0-RC1)

| # | Issue | Resolution |
|---|-------|------------|
| — | Public barrel missing 20+ documented types | Exported `Payment`, `PaymentStatus`, `PaymentStatusKind`, `isFinalStatus`, `isTransitionAllowed`, `PaymentRequest`, `Customer`, `CustomerReference`, `PaymentChannel`, `PaymentAttempt`, `HealthStatus`, `Page<T>`, `ListQuery`, `RefundRequest`, `RefundResult`, `ProviderCapabilities`, `WebhookEvent`, `WebhookInput`, `RefundCreateInput`, `EventHandler`, `Unsubscribe`, `PaymentEventType`, `PaymentEvent`, all 9 event subtypes, `HttpClient`, `HttpRequest`, `HttpResponse`, `Clock`, `IdGenerator`. Guarded by `tests/contract/public-api.spec.ts`. |
| — | Paystack business errors (.status:false, data:null) corrupted in initialize/list/refund mappers | Added `!response.status` guards throwing `ProviderError(response.message)` in `mapInitializeResponse`, `mapPaystackListResponse`, `mapPaystackRefundResponse`. |
| — | PaymentStatus.paidAt/failedAt/refundedAt used `new Date()` instead of real Paystack timestamps | Changed `mapPaystackStatus` to accept transaction data and derive timestamps from `paid_at`, `updated_at`, `created_at`. Added timestamp assertion tests. |
| — | FetchHttpClient always emitted generic `ProviderError` instead of specialized subclasses | Rewrote `mapError` to produce `ProviderBadRequestError` (400), `ProviderUnauthorizedError` (401/403), `ProviderNotFoundError` (404), `ProviderConflictError` (409), `ProviderRateLimitError` (429). |
| — | Metadata boolean values silently dropped before Paystack | Removed boolean filter; pass through as `Readonly<Record<string, string \| number \| boolean>>`. |
| — | `Payment.id` inconsistent (reference after init, Paystack numeric ID after verify) | `Payment.id` is now optional (`id?: string`). Set to `undefined` after `initialize()`, populated by `verify()`/`fetch()`. |
| — | No correlation ID forwarded to Paystack | Added `correlationId` field to `HttpRequest`; Paystack adapter passes per-call `correlationId` to every `httpClient.send()`. |
| — | No idempotency support | Added `idempotencyKey?: string` to `PaymentRequest`, `RefundRequest`, `RefundCreateInput`. Forwarded as `Idempotency-Key` header. |
| — | Refund reference was always a fabricated correlation ID | Added optional `reference` field to `RefundCreateInput`. User-supplied reference wins; falls back to generated ID. |
| — | `fetchRefund` use case bypassed the `Clock` port | Added `clock` to `FetchRefundDeps`; uses `deps.clock` instead of inline `new Date()`. |
| — | `refundPayment` use case returned type-cast `{ ok: true, value: ... } as Result<...>` | Replaced with `ok(refund)`. |

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
