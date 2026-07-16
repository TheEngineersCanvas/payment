# Concurrency

Concurrency model and thread safety of `@tec/payment`.

## Single-Threaded Event Loop

The SDK runs on Node.js's single-threaded event loop. There is no worker pool, no `worker_threads`, no shared-memory parallelism.

```ts
// All SDK code runs here, on the main thread
const result = await client.payments.initialize(req);
```

`async`/`await` yields to the event loop during I/O (network calls), but all SDK-internal processing happens serially.

## No Mutable Shared State

`createPaymentClient()` returns an immutable object graph:

```ts
const client = createPaymentClient({ ... });
// client.payments, client.refunds, etc. — all frozen references
```

- No module-level mutable variables
- No class instances with `set`-based state mutation
- No configuration reload — to change secrets, build a new client

## HTTP Client Concurrency

You can call multiple SDK methods concurrently. Each call is an independent `Promise`:

```ts
const [result1, result2, result3] = await Promise.all([
  client.payments.verify("order-1"),
  client.payments.verify("order-2"),
  client.payments.verify("order-3"),
]);
```

Each call gets its own HTTP request/response cycle. No shared connection state beyond the runtime's TCP connection pool (HTTP keep-alive).

## Event Bus Concurrency

The event bus dispatches synchronously within the same event loop tick:

```ts
// After initialize returns:
client.events.on("payment.initialized", async (event) => {
  // This handler runs synchronously (fire-and-forget)
  // emit() does NOT await this Promise
});
```

- **Fire-and-forget.** `emit()` schedules handlers and returns immediately.
- **Sequential dispatch.** Handlers for the same event run in registration order.
- **Error isolation.** A thrown handler error is caught, logged, and swallowed — it cannot break the chain or affect other handlers.
- **No re-entrancy.** A handler that calls `client.payments.verify()` and triggers another event will not deadlock (guarded by recursion check).

## Idempotency and Payment References

The SDK does **not** maintain an idempotency store. The `PaymentReference` is app-supplied:

```ts
// Same reference = idempotent request
client.payments.initialize({
  reference: PaymentReference("order-9001"), // app provides this
});
```

The provider (Paystack) guarantees at-most-once processing per reference. The SDK passes the reference through unchanged.

## Webhook Race Conditions

**Scenario:** User completes payment → browser redirects to callback → app calls `verify()` → simultaneously, webhook arrives.

**Resolution:** The app is responsible for ordering:
- `verify()` and webhook processing both update the same payment record.
- Use the payment's status as a guard: only transition from `initialized` → `success` once.
- The event bus emits `payment.succeeded` for both paths — use `eventId` on webhooks to deduplicate.

The SDK does not coordinate these two paths — that's the app's database's job.

## Transaction Boundaries

The SDK never opens a database transaction. It emits events; the app decides whether to persist them in a transaction:

```ts
client.events.on("payment.succeeded", async (event) => {
  await db.transaction(async (tx) => {
    await tx.payments.update(event.payment.reference, { status: "paid" });
    await tx.orders.fulfill(event.payment.reference);
  });
});
```

## Parallel Operations

Multiple `client.payments.verify()` calls are safe. Each uses independent HTTP requests.

Multiple `client.webhooks.receive()` calls are safe. Each verifies its own signature independently.

Multiple `client.refunds.create()` calls are safe. The provider API enforces idempotency per payment.
