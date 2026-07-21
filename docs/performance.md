# Performance

Performance characteristics of `@TheEngineersCanvas/payment`.

## Zero-Overhead Design

The SDK introduces no middleware pipeline, no proxy layer, no serialization overhead beyond what the provider's HTTP API requires:

```
App → PaymentService → Use Case → Adapter → fetch() → Provider API
```

Each layer adds minimal overhead — the hot path (initialize → verify) involves exactly one function call per layer before hitting the HTTP client.

## HTTP Client Performance

- Uses native `fetch()` (Node 18+, Bun). No `axios`, no `undici`, no `got`.
- Connection reuse via HTTP keep-alive (runtime default).
- Timeout via `AbortController` (configurable, default 30s).
- One automatic retry on idempotent GETs (500ms fixed delay). No exponential backoff ladder in v1.

## Memory Profile

- **Stateless.** The SDK owns no database connections, no connection pools, no caches. All memory is stack-local to a single request.
- **Event bus is in-process.** Handlers run synchronously in the same event loop tick. No queue buffers, no persisted events.
- **No module-level mutable state.** `createPaymentClient()` returns a frozen object graph.

## Cold Start

- `createPaymentClient()` initializes in ~1ms (config validation, object construction).
- First API call adds ~50ms for DNS resolution + TLS handshake (cached by runtime).
- Subsequent calls reuse the warm connection.

## Hot Path — Initialize → Verify

```
initializePayment:
  ~0.5ms  validate branded types
  ~0.3ms  adapter maps domain → provider DTO  
  ~1.0ms  JSON.stringify request body
  ~200ms  Paystack POST /transaction/initialize (network)
  ~0.5ms  JSON.parse response, map to Payment
  ~0.1ms  emit event
Total: ~203ms (200ms is network, ~3ms is SDK)

verifyPayment:
  ~0.1ms  validate PaymentReference
  ~150ms  Paystack GET /transaction/verify/:ref (network)
  ~0.5ms  JSON.parse response, map to Payment
Total: ~151ms (150ms is network, ~1ms is SDK)
```

**The bottleneck is the provider API, not the SDK.**

## Webhook Path

```
  ~0.1ms  Buffer → string conversion (if Buffer)
  ~0.2ms  HMAC-SHA512 computation (per provider's signing algorithm)
  ~0.1ms  crypto.timingSafeEqual comparison
  ~0.5ms  JSON.parse webhook body
  ~0.3ms  map to normalized WebhookEvent
  ~0.1ms  emit event
Total: ~1.3ms
```

Webhook processing is sub-millisecond once HMAC is computed.

## Bundle Size

Zero runtime dependencies. Published size:

- ESM: ~44 KB
- CJS: ~45 KB  
- Gzipped: ~15 KB
- Type declarations: ~21 KB

## When to NOT Optimize

The SDK is **not the bottleneck**. If you're seeing latency in payment flows:

1. Check provider API latency (Paystack, Stripe — 100-300ms is normal).
2. Check your database queries (inserting a payment record should be single-digit ms).
3. Check your event handlers (a slow `payment.succeeded` subscriber blocks subsequent handlers).

Do not parallelize provider calls — the API enforces ordering (verify must happen after initialize). If you need to process without user wait, use the event system.
