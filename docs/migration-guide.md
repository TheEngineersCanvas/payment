# Migration Guide

Migrating from direct provider SDK usage to `@TheEngineersCanvas/payment`.

## Why Migrate

- **One API, any provider.** Switch providers without changing application code.
- **Built-in event system.** React to payment events through a single pub/sub bus.
- **Result types.** Explicit error handling with `Result<T, E>` — no guessing which errors to catch.
- **Type safety.** Branded primitives for `Money`, `PaymentReference`, `Provider` prevent common bugs.
- **Zero runtime deps.** Nothing to audit, nothing to maintain in your dependency tree.

## Before: Direct Paystack Integration

```ts
import https from "https";

// Initialize
const response = await fetch("https://api.paystack.co/transaction/initialize", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  body: JSON.stringify({
    email: "customer@example.com",
    amount: 500000, // NGN 5,000 in kobo
    reference: "order-9001",
    callback_url: "https://myapp.com/verify",
  }),
});

const data = await response.json();
// Is data.status true? What if false? What error message?

// Verify
const verify = await fetch(
  `https://api.paystack.co/transaction/verify/order-9001`,
  { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } },
);
// Parse status, map to your own types...

// Webhook
app.post("/webhooks/paystack", express.raw({ type: "application/json" }), async (req, res) => {
  const hash = crypto.createHmac("sha512", secret).update(req.body).digest("hex");
  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(401).send("Invalid signature");
  }
  const event = JSON.parse(req.body);
  // Handle charge.success, transfer.success, etc.
  // Must know Paystack event names
  res.sendStatus(200);
});
```

## After: @TheEngineersCanvas/payment

```ts
import { createPaymentClient, Money, PaymentReference } from "@TheEngineersCanvas/payment";

const client = createPaymentClient({
  providers: {
    paystack: { secretKey: process.env.PAYSTACK_SECRET_KEY! },
  },
  defaultProvider: "paystack",
});

// Initialize
const result = await client.payments.initialize({
  amount: Money({ amount: 500000, currency: "NGN" }),
  reference: PaymentReference("order-9001"),
  customer: { kind: "new", email: "customer@example.com" },
  callbackUrl: "https://myapp.com/verify",
});

if (result.ok) {
  redirect(result.value.authorizationUrl);
} else {
  // Type-safe error handling
  console.error(result.error.code, result.error.message);
}

// Verify
const verified = await client.payments.verify(PaymentReference("order-9001"));

// Webhook — provider-agnostic
app.post("/webhooks/tec", express.raw({ type: "application/json" }), async (req, res) => {
  const result = await client.webhooks.receive({
    rawBody: req.body,
    signature: req.headers["x-paystack-signature"] as string,
  });

  if (!result.ok) {
    return res.status(401).json({ error: result.error.message });
  }

  // result.value.type is normalized: "payment.succeeded" (not "charge.success")
  res.json({ received: true });
});
```

## Breaking Changes to Expect

### 1. Result<T, E> instead of try/catch

```ts
// Before: try/catch with unknown errors
try {
  const payment = await paystack.transaction.initialize(args);
} catch (error) {
  // Is it a network error? Auth error? Validation?
}

// After: explicit Result
const result = await client.payments.initialize(args);
if (result.ok) {
  const payment = result.value;  // typed as Payment
} else {
  const error = result.error;    // typed as PaymentError
  // error.code, error.category, error.isRetryable
}
```

### 2. Branded Primitives

```ts
// Before: raw types
{ amount: 500000, reference: "order-9001" }

// After: branded types (validated)
{ amount: Money({ amount: 500000, currency: "NGN" }), reference: PaymentReference("order-9001") }
```

### 3. Events Instead of Callbacks

```ts
// Instead of passing callbacks, subscribe to events:
client.events.on("payment.succeeded", (event) => {
  // Fulfill order
});

client.events.on("payment.failed", (event) => {
  // Notify customer
});
```

## Webhook Handler Migration

| Before | After |
|--------|-------|
| `charge.success` | `payment.succeeded` |
| `transfer.success` | Handled by provider adapter |
| Manual HMAC | `client.webhooks.receive()` handles verification |
| Provider-specific event names | Normalized `WebhookEvent.type` |

## Event-Driven vs Callback Patterns

Before: callback-based flow in each handler:

```ts
async function handleWebhook(event) {
  if (event.event === "charge.success") {
    await updateOrder(event.data.reference, "paid");
    await sendReceipt(event.data.customer.email);
  }
}
```

After: subscribe once, handle everywhere:

```ts
client.events.on("payment.succeeded", async (event) => {
  await updateOrder(event.payment.reference, "paid");
});

client.events.on("payment.succeeded", async (event) => {
  await sendReceipt(event.payment.customer.email);
});
```

Multiple subscribers, single event source — no duplicate logic across webhook handlers.

## Testing with Mocks

`@TheEngineersCanvas/payment` ships `MockHttpClient` and `createMockClient()` for
integration testing without hitting the live provider API.

### Basic Mock Setup

```ts
import { createMockClient, Money, PaymentReference } from "@TheEngineersCanvas/payment";

const { client, http } = createMockClient();

// Seed the mock with expected responses
http.on("POST", "transaction/initialize", {
  status: 200,
  body: JSON.stringify({
    status: true,
    message: "Authorization URL created",
    data: {
      authorization_url: "https://checkout.paystack.com/test",
      access_code: "ACC_mock",
      reference: "order-001",
    },
  }),
});

http.on("GET", "transaction/verify", {
  status: 200,
  body: JSON.stringify({
    status: true,
    message: "Verification successful",
    data: {
      id: 9999,
      status: "success",
      reference: "order-001",
      amount: 500000,
      currency: "NGN",
      channel: "card",
      paid_at: "2026-07-20T10:00:00.000Z",
      created_at: "2026-07-20T09:55:00.000Z",
      updated_at: "2026-07-20T10:00:00.000Z",
      customer: { id: 1, email: "test@example.com" },
      authorization: null,
      gateway_response: "Successful",
      metadata: null,
      fees: 7500,
      fees_split: null,
    },
  }),
});

// Use the client normally — it hits the mock instead of Paystack
const result = await client.payments.initialize({
  amount: Money({ amount: 500000, currency: "NGN" }),
  reference: PaymentReference("order-001"),
  customer: { kind: "new", email: "test@example.com" },
});

expect(result.ok).toBe(true);
```

### Inspecting Requests

```ts
// Verify the mock received expected requests
const requests = http.getRequests();
expect(requests).toHaveLength(1);
expect(requests[0].method).toBe("POST");
expect(requests[0].url).toContain("transaction/initialize");

// Reset between tests
http.reset();
```

### Webhook Testing

```ts
import { createHmac } from "crypto";

const secret = "whsec_mock";
const { client } = createMockClient({ webhookSecret: secret });

const payload = JSON.stringify({
  event: "charge.success",
  data: {
    id: 9999,
    status: "success",
    reference: "order-001",
    amount: 500000,
    currency: "NGN",
    channel: "card",
    customer: { id: 1, email: "test@example.com" },
    paid_at: "2026-07-20T10:00:00.000Z",
    created_at: "2026-07-20T09:55:00.000Z",
    updated_at: "2026-07-20T10:00:00.000Z",
    authorization: null,
    gateway_response: "Successful",
    metadata: null,
    fees: null,
    fees_split: null,
  },
});

const signature = createHmac("sha512", secret).update(payload).digest("hex");

const result = await client.webhooks.receive({
  rawBody: payload,
  signature,
});

expect(result.ok).toBe(true);
expect(result.value.type).toBe("payment.succeeded");
```

### NestJS Integration Tests

```ts
import { Test } from "@nestjs/testing";
import { createMockClient } from "@TheEngineersCanvas/payment";

const { client, http } = createMockClient();

const module = await Test.createTestingModule({
  providers: [
    { provide: "PAYMENT_CLIENT", useValue: client },
    // ... your service that depends on PAYMENT_CLIENT
  ],
}).compile();
```

### Chaining Responses

```ts
http
  .on("POST", "initialize", { status: 200, body: JSON.stringify({ ... }) })
  .on("GET", "verify", { status: 200, body: JSON.stringify({ ... }) });
```

The `on()` method returns `this` for chaining.
