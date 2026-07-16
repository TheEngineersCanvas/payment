# Provider Guide

A focused guide on implementing a new payment provider adapter for `@tec/payment`.

## Provider Contract Checklist

| Method | Required | HTTP Method | Notes |
|--------|----------|-------------|-------|
| `initialize` | Yes | POST | Create payment, return authorization URL |
| `verify` | Yes | GET | Confirm payment by reference |
| `fetch` | Yes | GET | Look up by provider-assigned ID |
| `list` | Yes | GET | Paginated list with filters |
| `refund` | Yes | POST | Full or partial refund |
| `parseWebhook` | Yes | — | Signature verify + event normalize |
| `fetchRefund` | No | GET | Fetch specific refund by ID |
| `health` | Yes | — | Liveness check |

## Provider Capabilities

```ts
interface ProviderCapabilities {
  readonly supportsAuthorizationUrl: boolean;   // redirect-based flows
  readonly supportsRecurring: boolean;          // reserved for v2
  readonly supportsPartialRefund: boolean;      // refunds less than full amount
  readonly supportsWebhooks: boolean;           // provider sends webhooks
  readonly maxAmount?: Money;                   // max transaction amount
  readonly supportedCurrencies: ReadonlyArray<Currency>;
  readonly supportedChannels: ReadonlyArray<PaymentChannel>;
}
```

## Money Mapping

All amounts in the SDK are in **minor units** (kobo/cents). Map provider amounts directly:

```ts
// Paystack: amount is in kobo
amount: Money({ amount: data.amount, currency: data.currency })

// Stripe: amount is in cents  
amount: Money({ amount: data.amount, currency: data.currency.toUpperCase() })
```

## Status Mapping

Map provider-specific statuses to `PaymentStatus`:

```ts
type PaymentStatus =
  | { kind: "initialized" }
  | { kind: "pending" }
  | { kind: "success"; paidAt: Date }
  | { kind: "failed"; reason: string; failedAt: Date }
  | { kind: "abandoned" }
  | { kind: "refunded"; refundedAt: Date; refundId: string };
```

| Paystack | Stripe | Domain |
|----------|--------|--------|
| `"abandoned"` | `"canceled"` | `"abandoned"` |
| `"ongoing"` | `"requires_payment_method"` | `"pending"` |
| `"success"` | `"succeeded"` | `"success"` |
| `"failed"` | `"payment_failed"` | `"failed"` |

## Webhook Mechanics

### Signature Verification

Each provider signs webhooks differently:

| Provider | Header | Algorithm |
|----------|--------|-----------|
| Paystack | `x-paystack-signature` | HMAC-SHA512 (hex) |
| Stripe | `stripe-signature` | HMAC-SHA256, `t=timestamp,v1=mac` |

Use the `WebhookVerifier` port or implement provider-specific logic in the adapter's `parseWebhook` method.

### Event Normalization

Map provider event types to normalized ones:

```ts
type WebhookEventType =
  | "payment.initialized" | "payment.pending"
  | "payment.succeeded"   | "payment.failed"
  | "refund.initiated"    | "refund.succeeded" | "refund.failed"
  | "unknown";
```

## Error Mapping

Map provider error responses to `ProviderError` subclasses:

| Provider Response | Domain Error |
|-------------------|--------------|
| HTTP 400 | `ProviderBadRequestError` |
| HTTP 401/403 | `ProviderUnauthorizedError` |
| HTTP 404 | `ProviderNotFoundError` |
| HTTP 409 | `ProviderConflictError` |
| HTTP 429 | `ProviderRateLimitError` |
| HTTP 5xx | `ProviderUnavailableError` |
| Network error | `NetworkError` |
| Timeout | `TimeoutError` |

## References Format

Each provider has constraints on the payment reference:

| Provider | Format | Max Length |
|----------|--------|------------|
| Paystack | `[A-Za-z0-9._=,+\-]` | 100 chars |
| Stripe | `[a-zA-Z0-9_]` | 500 chars |

The SDK validates references with a generic regex (`[A-Za-z0-9._=,+\-]`, 6-100 chars). Provider-specific validation happens at the API, not the SDK.

## Testing

Run the contract test suite against your adapter:

```bash
bun run test -- tests/contract/provider-contract.spec.ts
```

## Paystack Reference Implementation

See `src/infrastructure/providers/paystack/` for the complete reference implementation:

- `paystack-adapter.ts` — Full adapter
- `paystack-types.ts` — API DTOs
- `paystack-mapper.ts` — DTO → domain mapping  
- `paystack-webhook.ts` — Signature verification and parsing
- `register.ts` — Provider registration
