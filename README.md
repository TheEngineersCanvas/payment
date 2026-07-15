# @tec/payment

Framework-agnostic payment abstraction SDK by TheEngineersCanvas.

Provider-agnostic TypeScript SDK for payment processing. One API, any provider.

## Install

```bash
bun add @tec/payment
```

## Quickstart

```ts
import { createPaymentClient, Money, PaymentReference } from "@tec/payment";

const tec = createPaymentClient({
  providers: {
    paystack: { secretKey: process.env.PAYSTACK_SECRET_KEY! },
  },
  defaultProvider: "paystack",
});

// Initialize a payment
const result = await tec.payments.initialize({
  amount: Money({ amount: 500000, currency: "NGN" }), // 5,000.00 NGN in kobo
  reference: PaymentReference("order-9001"),
  customer: { kind: "new", email: "customer@example.com" },
  callbackUrl: "https://myapp.com/verify",
});

if (result.ok) {
  // Redirect user to Paystack checkout
  redirect(result.value.authorizationUrl);
} else {
  console.error(result.error.message);
}

// After redirect, verify the payment
const verified = await tec.payments.verify(PaymentReference("order-9001"));

if (verified.ok && verified.value.status.kind === "success") {
  // Payment confirmed
}

// Subscribe to events
tec.events.on("payment.succeeded", (event) => {
  console.log("Payment succeeded:", event.payment.reference);
});

// Receive webhooks
app.post("/webhooks/tec", express.raw({ type: "application/json" }), async (req, res) => {
  const result = await tec.webhooks.receive({
    rawBody: req.body,        // Buffer from express.raw()
    signature: req.headers["x-paystack-signature"] as string,
    headers: req.headers as Record<string, string>,
  });

  if (!result.ok) {
    return res.status(401).json({ error: result.error.message });
  }

  // result.value is a normalized WebhookEvent
  res.json({ received: true });
});

// Refund a payment
const refundResult = await tec.refunds.create({
  paymentId: "3811142484",
  amount: Money({ amount: 100000, currency: "NGN" }),
  reason: "Customer requested refund",
});

if (refundResult.ok) {
  console.log("Refund initiated:", refundResult.value.id);
}

// Health check
const health = await tec.health();
```

## Environment variables

```bash
export TEC_PAYMENT_PAYSTACK_SECRET_KEY=sk_test_...
export TEC_PAYMENT_DEFAULT_PROVIDER=paystack

# Then:
const tec = createPaymentClient.fromEnv();
```

## Supported providers

| Provider | Status |
|----------|--------|
| Paystack | Live — payments, webhooks, refunds |

## Development

```bash
bun install
bun run check-types    # tsc --noEmit
bun run test           # vitest (unit + contract)
bun run build          # tsup (ESM + CJS + d.ts)
```
