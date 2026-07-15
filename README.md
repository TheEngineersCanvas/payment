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
| Paystack | Live |

## Development

```bash
bun install
bun run check-types    # tsc --noEmit
bun run test           # vitest (unit + contract)
bun run build          # tsup (ESM + CJS + d.ts)
```
