# Task 003 — Phase 3: Webhooks, Refunds, Hardening

- **Title:** Phase 3: Webhooks, Refunds, Hardening
- **Date:** 2026-07-15
- **Objective:** Replace stub `RefundService` and `WebhookService` with production implementations, add `Refund` domain model + events, wire real HMAC verifier per provider, fix 3 debt items, and document the webhook raw-body contract.
- **Status:** Complete

## Summary

Phase 3 makes `client.webhooks.receive()` and `client.refunds.create()` functional. The stub `NotImplemented` returns are replaced with real implementations that call provider APIs, emit domain events, and follow the hexagonal architecture conventions established in Phase 2.

63 unit/contract/integration tests pass (CI-safe). 5 Paystack sandbox tests skip when `PAYSTACK_SECRET_KEY` is absent.

## Files Changed

### New files (14)

**Domain (5):**
- `src/domain/refund/refund.ts` — Refund entity
- `src/domain/refund/refund-status.ts` — RefundStatus discriminated union + `isFinalRefundStatus`
- `src/domain/refund/refund-reason.ts` — RefundReason branded type
- `src/domain/events/refund-initiated.ts` — RefundInitiated event
- `src/domain/events/refund-succeeded.ts` — RefundSucceeded event
- `src/domain/events/refund-failed.ts` — RefundFailed event

**Use cases (2):**
- `src/application/use-cases/parse-webhook.ts` — Parses rawBody+signature → normalized WebhookEvent + emits webhook.received
- `src/application/use-cases/refund-payment.ts` — Initiates refund via provider → Refund domain object + emits refund.* event

**Tests (6):**
- `src/domain/reference/payment-reference.test.ts` — 6 tests for the loosened regex
- `src/application/use-cases/parse-webhook.test.ts` — 4 tests (valid sig, invalid sig, non-UTF-8 Buffer, Buffer acceptance)
- `src/application/use-cases/refund-payment.test.ts` — 5 tests (pending, succeeded, failed, zero amount, partial refund)
- `tests/integration/webhook-flow.spec.ts` — 3 tests (E2E receive/verify, tamper rejection, event emission)
- `tests/integration/refund-flow.spec.ts` — 1 test (init → verify → refund, gated on PAYSTACK_SECRET_KEY)

**Fixtures (1):**
- `tests/fixtures/paystack-refund.json` — Paystack refund response

**Docs (2):**
- `docs/security.md` — Threat model, webhook raw-body contract, Next.js/Hono/Express snippets, secret redaction, HMAC timing-safety, dependency hygiene
- `docs/public-api.md` — Public API reference (stub for Phase 4 expansion)

### Modified files (12)

- `src/domain/events/payment-events.ts` — Added RefundInitiated | RefundSucceeded | RefundFailed to PaymentEvent union + re-exports
- `src/domain/events/webhook-received.ts` — Added `eventId` field for dedupe
- `src/domain/reference/payment-reference.ts` — Regex loosened from `^[a-zA-Z0-9_-]+$` to `^[A-Za-z0-9._=,+\-]{6,100}$`, removed separate length check (now in regex)
- `src/application/ports/webhook-verifier.ts` — `verify()` now accepts `rawBody: string | Buffer` instead of only `string`
- `src/infrastructure/webhook/hmac-webhook-verifier.ts` — `verify()` accepts `string | Buffer`, uses `Buffer.from()` for string bodies and `Buffer` directly for raw
- `src/infrastructure/webhook/hmac-webhook-verifier.test.ts` — 2 new Buffer tests
- `src/infrastructure/providers/paystack/paystack-mapper.ts` — `normalizeWebhookType` now maps `refund.processed → refund.succeeded`, `refund.failed → refund.failed`, `refund.pending → refund.initiated`. Added `mapRefundResultToRefund()` for RefundResult → Refund domain mapping.
- `src/application/services/webhook-service.ts` — Real implementation replacing stub InternalError
- `src/application/services/refund-service.ts` — Real `create()` implementation replacing stub; `fetch()` remains stub
- `src/public-api/client.ts` — Replaced stub `{ verify: () => false }` with real `HmacWebhookVerifier(webhookSecret ?? secretKey)`. Wired RefundService/WebhookService with proper deps.
- `src/public-api/index.ts` — Export Refund, RefundStatus, RefundStatusKind, isFinalRefundStatus, RefundReason
- `tests/contract/provider-contract.spec.ts` — Added 3 refund tests + 3 parseWebhook tests; switched adapter from stub verifier to real HmacWebhookVerifier
- `README.md` — Added webhook receive + refund create examples; updated provider table

## Design Decisions

1. **Refund-by-id only.** The RefundService.create requires the provider-assigned numeric payment `id` (not PaymentReference). Apps call `payments.verify()` first to get the id. This mirrors the existing adapter `refund()` contract and avoids an extra `fetch` call on the refund critical path.
2. **`WebhookService` uses default provider.** v1 removes the `provider` routing field from `WebhookInput`. Multi-provider routing is deferred to v2. The `provider` field is kept as optional for API stability.
3. **In-process HTTP server for E2E webhook test.** No external dependencies. The test spins up `node:http`, signs a body with `crypto.createHmac`, posts it via `fetch`, captures `req.rawBody`, and verifies the full pipeline. CI-safe.
4. **`HmacWebhookVerifier` accepts `string | Buffer`.** When a `Buffer` is passed, bytes are HMAC'd directly — the app can pass `req.rawBody` without re-encoding. This is the canonical path documented in `docs/security.md`.
5. **`WebhookReceived.eventId` is additive.** The existing event `WebhookReceived` was missing the provider-issued webhook id. Added as an optional field that downstream subscribers can use for deduplication.

## Security Review

- **Stub verifier removed.** Before this change, `createPaymentClient` injected `{ verify: () => false }` — a latent gap where the adapter's own `parseWebhook` path (via `parsePaystackWebhook`) was using real verification, but anyone route-rending `provider.parseWebhook` through a different path would see the stub. Now each provider gets a real `HmacWebhookVerifier` keyed on `webhookSecret ?? secretKey`.
- **Buffer → HMAC without re-encoding.** The `HmacWebhookVerifier` passes `Buffer` directly to `createHmac.update()`. No intermediate encoding step.
- **Timing-safe comparison unchanged.** `crypto.timingSafeEqual` for all HMAC checks.
- **Webhook raw-body contract documented.** `docs/security.md` is the single source of truth for the "exact bytes" requirement with framework-specific snippets.
- **Refund at-most-once semantics documented.** Refunds through Paystack's `/refund` endpoint may return `pending` or `processing`. The synchronous path emits `refund.initiated`. The `refund.succeeded` event is only emitted if the API returns `processed` directly, or when the webhook confirms later. The `refund.failed` event is emitted if the API returns a synchronous failure or the webhook reports failure.

## Testing Guide

```bash
# Unit + contract + webhook integration (CI-safe, no secrets needed)
bun run test -- --exclude "tests/integration/paystack.spec.ts" --exclude "tests/integration/refund-flow.spec.ts"

# All tests including Paystack sandbox
PAYSTACK_SECRET_KEY=sk_test_... bun run test

# Type check
bun run check-types

# Build
bun run build
```

**New integration test (webhook-flow):**
```bash
bun run test -- tests/integration/webhook-flow.spec.ts
```

**Manual webhook smoke test:**
```ts
import { createHmac } from "node:crypto";
import { createPaymentClient } from "@TheEngineersCanvas/payment";

const secret = "my_webhook_secret";
const client = createPaymentClient({
  providers: { paystack: { secretKey: "sk_test_...", webhookSecret: secret } },
  defaultProvider: "paystack",
});

const payload = JSON.stringify({ event: "charge.success", data: { ... } });
const sig = createHmac("sha512", secret).update(payload).digest("hex");

const result = await client.webhooks.receive({
  rawBody: payload,
  signature: sig,
});
```

## Risks

1. **Refund `fetch` still stubbed.** `RefundService.fetch(id)` returns `InternalError("refund_fetch_not_implemented")`. This was never in the Phase 2 or Phase 3 scope; defer to Phase 4.
2. **Multi-provider webhook routing not implemented.** If an app configures multiple providers, `webhooks.receive()` always uses the default provider. A `provider` field exists on the input but is ignored. Documented limitation; implement in Phase 4.

## Future Improvements

- Add `WebhookService.verify()` use case for replay-resilient event re-emission (needs event store).
- Add `RefundService.fetch()` and `RefundService.list()`.
- Multi-provider webhook routing based on `x-paystack-*` header patterns.
- Add `refund.initiated` → `refund.succeeded` bridging in the webhook flow when Paystack confirms async.

## Related Tasks

- Phase 2 (Paystack end-to-end — complete)
- Phase 4 (polish, docs, examples, ESLint, CHANGELOG, release — next)

## Suggested Git Commit

```
feat(phase-3): webhooks, refunds, hardening

- Domain: Refund, RefundStatus, RefundReason; refund events
  (RefundInitiated, RefundSucceeded, RefundFailed) added to
  PaymentEvent union
- Use cases: parseWebhook (rawBody+signature → WebhookEvent),
  refundPayment (paymentId+amount?+reason → Refund)
- Services: WebhookService and RefundService replace their
  not-implemented stubs; real HmacWebhookVerifier wired per
  provider in createPaymentClient (was a stub before)
- Paystack: refund.processed|failed|pending now map to
  refund.succeeded|failed|initiated normalized types
- HmacWebhookVerifier accepts string | Buffer so apps can pass
  req.rawBody without re-encoding
- PaymentReference regex loosened to accept Paystack-valid
  characters (.,=,+)
- WebhookReceived event gains eventId for app-side dedupe
- Tests: +25 unit/contract + 4 integration (webhook E2E via
  in-process node:http server, refund via Paystack sandbox)
  = 63 total (68 with sandbox)
- Docs: docs/security.md (threat model + raw-body contract
  + framework snippets); docs/public-api.md stub; README
  webhook + refunds sections
```
