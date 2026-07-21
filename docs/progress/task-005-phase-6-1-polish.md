# Task: Phase 6.1 — SDK Polish

**Date:** 2026-07-21

## Objective

Ship low-risk SDK improvements identified during consumer review: fees/netAmount/accessCode on Payment, per-request correlation IDs, fromEnv() fallback to provider-native env vars, configurable webhook path, webhook logging.

## Summary

Added three new fields to `Payment` (`fees`, `netAmount`, `accessCode`) surfaced from Paystack responses for financial reporting and consumer storage. Added `correlationId` to `PaymentRequest`, `RefundCreateInput`, `RefundPaymentInput`, and `RefundRequest` — consumers provide their own tracing IDs; the SDK generates a fallback when omitted. `fromEnv()` now checks provider-native env vars (`PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`, `PAYSTACK_BASE_URL`) as fallback after the `TEC_PAYMENT_*` namespace. NestJS adapter gains `webhookPath` option and debug/warn logging in `WebhookController`.

## Files Changed

### Modified Files

| File | Change |
|------|--------|
| `src/domain/payment/payment.ts` | Added `fees?: Money`, `netAmount?: Money`, `accessCode?: string` |
| `src/domain/payment/payment-request.ts` | Added `correlationId?: string` |
| `src/application/ports/payment-provider.ts` | Added `correlationId?: string` to `RefundRequest` |
| `src/application/services/refund-service.ts` | Added `correlationId?: string` to `RefundCreateInput` |
| `src/application/use-cases/refund-payment.ts` | Added `correlationId?: string` to `RefundPaymentInput`; honor input correlationId before generating |
| `src/application/use-cases/initialize-payment.ts` | Use `input.correlationId ?? deps.idGenerator.generate()` for event |
| `src/infrastructure/providers/paystack/paystack-mapper.ts` | `mapPaystackTransactionToPayment`: surface `fees`, `netAmount` from `tx.fees`. `mapInitializeResponse`: surface `access_code` as `accessCode` |
| `src/infrastructure/providers/paystack/paystack-adapter.ts` | `initialize()` and `refund()` honor `req.correlationId` / `input.correlationId` before generating |
| `src/infrastructure/providers/paystack/paystack-mapper.test.ts` | Tests for fees, netAmount, accessCode extraction + null fees case |
| `src/public-api/client.ts` | `fromEnv()` checks `PAYSTACK_SECRET_KEY` etc. as fallback after `TEC_PAYMENT_*` |
| `src/public-api/version.ts` | Bumped to `0.1.0-RC3` |
| `src/adapters/nestjs/payment.module.ts` | Added `webhookPath?: string` to `PaymentModuleOptions` and `PaymentModuleAsyncOptions`; dynamic controller class factory for custom paths; injects `Logger` into `WebhookController` |
| `src/adapters/nestjs/webhook.controller.ts` | Accepts optional `LoggerService`; logs received webhooks at `log` level, verification failures at `warn` level |
| `docs/public-api.md` | Documented `fees`, `netAmount`, `accessCode`, `correlationId`, `fromEnv()` fallback, `RefundRequest.correlationId` |
| `tests/contract/public-api.spec.ts` | Added Payment fields test, PaymentRequest.correlationId test, RefundCreateInput.correlationId test, RefundRequest.correlationId test; bumped VERSION |
| `docs/memory/current-state.md` | Updated |

## Design Decisions

1. **`fees`/`netAmount` conditional** — Only populated when Paystack returns `tx.fees` (non-null). `undefined` after `initialize()` and for non-successful transactions. Avoids fabricating a `Money` with zero fees.

2. **`accessCode` on Payment not PaymentRequest** — `access_code` comes from the Paystack response (same as `authorization_url`), so it belongs on `Payment`, not `PaymentRequest`.

3. **Correlation ID precedence** — `request.correlationId` → `idGenerator.generate()`. Clean fallback chain with no breaking change.

4. **`fromEnv()` TEC_PAYMENT_* wins** — If both `TEC_PAYMENT_PAYSTACK_SECRET_KEY` and `PAYSTACK_SECRET_KEY` are set, the namespaced one wins. This preserves the explicit-intent semantics of the SDK namespace.

5. **Dynamic webhook controller class** — When `webhookPath` differs from default, the module creates a decorator-applied subclass via `createWebhookControllerClass()`. Default path uses the statically-decorated base `WebhookController`.

6. **Logger as optional constructor param** — Backward compatible: direct instantiation without a logger works; `PaymentModule.forRoot()` injects `new Logger("WebhookController")`.

## API Changes

- `Payment` gains `fees?: Money`, `netAmount?: Money`, `accessCode?: string`
- `PaymentRequest` gains `correlationId?: string`
- `RefundCreateInput` gains `correlationId?: string`
- `RefundRequest` gains `correlationId?: string`
- `RefundPaymentInput` gains `correlationId?: string`
- `PaymentModuleOptions` and `PaymentModuleAsyncOptions` gain `webhookPath?: string`
- `fromEnv()` falls back to provider-native env vars

All additions are backward-compatible (new optional fields on existing types).

## Database Changes

None. SDK is stateless.

## Security Review

- No new secrets handling.
- Webhook logging at `warn` level redacts payload data — only the error message is logged.
- `fromEnv()` does not introduce new attack surface — env var access is read-only at process start.
- No secrets exposed in debug logs.

## Testing Guide

```bash
bun run check-types  # tsc --noEmit
bun run lint          # ESLint with boundary enforcement
bun run test          # vitest (119 tests)
```

### Manual Testing

1. **Fees/NetAmount:** Initialize a payment via Paystack sandbox, verify it, check `payment.fees` and `payment.netAmount` are populated.
2. **Correlation ID:** `await client.payments.initialize({ ..., correlationId: "my-trace-id-1" })` — verify the event bus emits `payment.initialized` with `correlationId: "my-trace-id-1"`.
3. **fromEnv():** Set `PAYSTACK_SECRET_KEY=sk_test_abc` (no TEC prefix), call `createPaymentClient.fromEnv()`, verify the client works.
4. **Webhook path:** `PaymentModule.forRoot(config, { webhookPath: "hooks/paystack" })` — verify controller is registered at `POST /hooks/paystack`.

## Risks

- **`accessCode` only populated after initialize** — verified/fetched payments have `accessCode: undefined`. Documented in public-api.md.
- **Dynamic controller class creation** may not be compatible with all NestJS tooling (e.g. Swagger document builder). Mitigated by keeping `DEFAULT_WEBHOOK_PATH` as the static default.

## Future Improvements

- Add `correlationId` to `WebhookService.receive()` for end-to-end tracing through webhook flow
- Expose `WEBHOOK_LOGGER` injection token for consumers to override

## Suggested Git Commit

```
feat(sdk): add fees, netAmount, accessCode, correlation IDs, env fallback, webhook path

- Payment gains fees?, netAmount?, accessCode?
- PaymentRequest, RefundCreateInput, RefundRequest gain correlationId?
- Paystack adapter honors request-level correlationId with auto-fallback
- fromEnv() falls back to PAYSTACK_SECRET_KEY etc. after TEC_PAYMENT_*
- NestJS: configurable webhookPath + debug/warn logging in controller
- Bump to 0.1.0-RC3
```
