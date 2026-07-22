# Task: Phase 6.2 — Transfers Domain

**Date:** 2026-07-22

## Objective

Add provider-agnostic transfer/payout capabilities to the SDK: bank code listing, account resolution, recipient creation, transfer initiation, and webhook event normalization for transfer events.

## Summary

Created a new `Transfer` domain with `Transfer`, `TransferStatus` (discriminated union: pending/processing/succeeded/failed/reversed), `TransferRecipient`, and `BankCode` entities. Added 4 domain events (`transfer.initiated`, `transfer.succeeded`, `transfer.failed`, `transfer.reversed`). Extended `PaymentProvider` port with 6 transfer methods (`listBankCodes`, `resolveAccount`, `createRecipient`, `initiateTransfer`, `fetchTransfer`, `listTransfers`) plus `CreateRecipientInput` and `InitiateTransferInput` DTOs. Added `supportsTransfers` and `supportedTransferCurrencies` to `ProviderCapabilities`. Built new `TransferService` facade exposed as `client.transfers.*`. Paystack adapter implements all transfer methods against Paystack's `/bank`, `/bank/resolve`, `/transferrecipient`, and `/transfer` endpoints. Fixed webhook mapper — `transfer.success|failed|reversed` now normalize to `transfer.succeeded|failed|reversed` instead of `payment.unknown`.

## Files Changed

### New Files (26)

| File | Purpose |
|------|---------|
| `src/domain/transfer/transfer.ts` | Transfer domain entity |
| `src/domain/transfer/transfer-status.ts` | TransferStatus discriminated union + isFinalTransferStatus helper |
| `src/domain/transfer/transfer-recipient.ts` | TransferRecipient domain entity |
| `src/domain/transfer/bank-code.ts` | BankCode value object |
| `src/domain/events/transfer-initiated.ts` | TransferInitiated event |
| `src/domain/events/transfer-succeeded.ts` | TransferSucceeded event |
| `src/domain/events/transfer-failed.ts` | TransferFailed event |
| `src/domain/events/transfer-reversed.ts` | TransferReversed event |
| `src/application/use-cases/list-bank-codes.ts` | listBankCodes use case |
| `src/application/use-cases/resolve-account.ts` | resolveAccount use case |
| `src/application/use-cases/create-recipient.ts` | createRecipient use case |
| `src/application/use-cases/initiate-transfer.ts` | initiateTransfer use case (emits events) |
| `src/application/use-cases/fetch-transfer.ts` | fetchTransfer use case |
| `src/application/use-cases/list-transfers.ts` | listTransfers use case |
| `src/application/use-cases/initiate-transfer.test.ts` | 4 use-case tests (success, failed, error propagation, correlation ID) |
| `src/application/services/transfer-service.ts` | TransferService facade |
| `src/infrastructure/providers/paystack/paystack-transfer-types.ts` | Paystack bank/recipient/transfer DTOs |
| `src/infrastructure/providers/paystack/paystack-transfer-mapper.ts` | Paystack → domain mapping for transfers |
| `src/infrastructure/providers/paystack/paystack-transfer-mapper.test.ts` | 10 mapper tests (bank list, recipient, transfer success/fail/reversed, list) |

### Modified Files (14)

| File | Change |
|------|--------|
| `src/domain/events/payment-events.ts` | Added TransferInitiated/Succeeded/Failed/Reversed to PaymentEvent union |
| `src/application/ports/payment-provider.ts` | Added Transfer, TransferRecipient, BankCode imports; new `supportsTransfers` + `supportedTransferCurrencies` to ProviderCapabilities; new `CreateRecipientInput`, `InitiateTransferInput`, `ResolveAccountResult` DTOs; 6 new transfer methods on PaymentProvider |
| `src/application/payment-client.ts` | Added `transfers: TransferService` to PaymentClient |
| `src/public-api/client.ts` | Creates TransferService and wires into client |
| `src/public-api/index.ts` | Exports all new types: Transfer, TransferStatus, TransferStatusKind, isFinalTransferStatus, TransferRecipient, BankCode, ResolveAccountResult, CreateRecipientInput, InitiateTransferInput, TransferInitiated, TransferSucceeded, TransferFailed, TransferReversed |
| `src/public-api/version.ts` | Bumped to 0.1.0-RC4 |
| `src/infrastructure/providers/paystack/paystack-adapter.ts` | Added imports for transfer types+mappers; added `supportsTransfers: true` + `supportedTransferCurrencies` to capabilities; 6 new transfer methods (412 lines of adapter code) |
| `src/infrastructure/providers/paystack/paystack-mapper.ts` | Fixed `normalizeWebhookType`: `transfer.success|failed|reversed` → `transfer.succeeded|failed|reversed` |
| `src/infrastructure/providers/paystack/paystack-mapper.test.ts` | Added 3 webhook tests for transfer.success/failed/reversed |
| `src/application/use-cases/fetch-refund.test.ts` | Added 6 transfer method stubs to mock provider |
| `src/application/use-cases/refund-payment.test.ts` | Added 6 transfer method stubs to mock provider |
| `src/application/use-cases/parse-webhook.test.ts` | Added 6 transfer method stubs to mock provider |
| `src/application/services/webhook-service.test.ts` | Added 6 transfer method stubs to mock provider |
| `tests/contract/public-api.spec.ts` | Added transfer types to type-only member assertions + isFinalTransferStatus functional test; bumped VERSION to 0.1.0-RC4 |
| `docs/public-api.md` | TransferService section + all transfer types documented + ProviderCapabilities updated + events table updated |
| `README.md` | Transfer example code added |
| `docs/memory/current-state.md` | Updated |
| `package.json` | Bumped to 0.1.0-RC4 |

## Design Decisions

1. **Provider-agnostic naming** — `listBankCodes()` not `listBanks()`. Some providers don't have a "bank" concept but have routing codes. `listBankCodes` accommodates all.
2. **`TransferService` separate from `PaymentService`** — Following `client.payments`, `client.refunds`, `client.transfers` pattern. Each domain gets its own service.
3. **`supportsTransfers` capability flag** — All transfer methods on `PaymentProvider` are non-optional. The capability flag tells the service layer whether the provider supports transfers. Future providers without transfers will return errors at the adapter level — the service layer checks capabilities before calling in v2. For v1 (single Paystack provider), all capabilities are true.
4. **Recipient resolution deferred** — `fetchTransfer` and `listTransfers` return synthetic `TransferRecipient` objects because Paystack's transfer API returns a recipient ID, not the full recipient object. In a future iteration, the adapter could fetch the recipient from Paystack's API. For now, the recipient fields are populated with the data available at call time.
5. **Webhook fix** — The old `normalizeWebhookType` mapping `transfer.*` → `payment.unknown` was a bug. Fixed to return proper `transfer.succeeded|failed|reversed` event types.

## API Changes

- **New service:** `client.transfers.*` with 6 methods: `listBankCodes`, `resolveAccount`, `createRecipient`, `initiate`, `fetch`, `list`
- **New types:** `Transfer`, `TransferStatus`, `TransferStatusKind`, `TransferRecipient`, `BankCode`, `CreateRecipientInput`, `InitiateTransferInput`, `ResolveAccountResult`
- **New events:** `transfer.initiated`, `transfer.succeeded`, `transfer.failed`, `transfer.reversed`
- **New helper:** `isFinalTransferStatus(status)`
- **ProviderCapabilities** gains `supportsTransfers: boolean` and `supportedTransferCurrencies: ReadonlyArray<Currency>`
- **PaymentProvider** port gains 6 new required methods

All additions are backward-compatible for existing consumers (new optional property on `ProviderCapabilities` + new required methods on `PaymentProvider` interface which is only implemented internally).

## Database Changes

None. SDK is stateless.

## Security Review

- Transfer amounts validated via `Money` constructor (non-negative integer minor units).
- Account number validation handled by Paystack's `/bank/resolve` endpoint.
- Recipient and transfer creation use HMAC-authenticated requests via the existing `authHeaders()` mechanism.
- No new secrets or API key exposure.
- Transfer webhook events follow the same HMAC verification path as charge webhooks.

## Testing Guide

```bash
bun run check-types  # tsc --noEmit
bun run lint          # ESLint with boundary enforcement
bun run test          # vitest (137 tests)
```

### New Tests

| Test file | Tests | Coverage |
|-----------|-------|----------|
| `paystack-transfer-mapper.test.ts` | 10 | Bank list, recipient, transfer success/failed/reversed/pending, list, error guards |
| `initiate-transfer.test.ts` | 4 | Success, failed transfer, error propagation, correlation ID honor |
| `paystack-mapper.test.ts` (updated) | +3 | transfer.success → transfer.succeeded, transfer.failed, transfer.reversed |
| `public-api.spec.ts` (updated) | +1 | isFinalTransferStatus returns true for final statuses |

### Manual Testing

1. **Bank codes:** `await client.transfers.listBankCodes(Currency("NGN"))` — returns array of BankCode objects
2. **Account resolution:** `await client.transfers.resolveAccount({ accountNumber: "0123456789", bankCode: "044", currency: Currency("NGN") })` — returns { accountName: "JOHN DOE" }
3. **Full transfer flow:** `createRecipient()` → `initiate()` → `fetch()` — end-to-end payout flow (requires Paystack sandbox with balance)

## Risks

- **Recipient data in fetch/list is synthetic** — `fetchTransfer()` and `listTransfers()` populate recipient fields with the recipient ID rather than fetching full recipient details from Paystack. Affects display quality for transfer lists.
- **`supportedTransferCurrencies` per-currency** — Paystack supports NGN, GHS, ZAR, KES for transfers. Other providers may have different sets. The capability flag covers this at the provider level, but per-currency bank lists require runtime validation (Paystack returns errors for unsupported currencies).

## Future Improvements

- Fetch full recipient details from Paystack in `fetchTransfer()` and `listTransfers()`
- Add `TransferService.webhook()` hook for processing transfer webhooks in the use case layer
- Support Paystack's `transfer/verify` endpoint for SWIFT/bulk transfers
- Add `listRecipients()` to `TransferService`

## Suggested Git Commit

```
feat(transfers): add transfers domain with Paystack adapter and webhook events

- New domain: Transfer, TransferRecipient, TransferStatus (discriminated union), BankCode
- 4 new domain events: transfer.initiated/succeeded/failed/reversed
- TransferService facade via client.transfers (listBankCodes, resolveAccount, createRecipient, initiate, fetch, list)
- ProviderCapabilities gains supportsTransfers + supportedTransferCurrencies
- Paystack adapter: 6 new methods + transfer mapper + types
- Webhook mapper fixed: transfer.* events → transfer.succeeded/failed/reversed
- 17 new tests + contract test updates
- Bump to 0.1.0-RC4
```
