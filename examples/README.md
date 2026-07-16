# @tec/payment Examples

Example integrations for popular Node.js frameworks.

## Examples

| Framework | Directory | Key Features |
|-----------|-----------|--------------|
| Next.js (App Router) | `nextjs/` | Server Actions (`actions.ts`) + Route Handler (`route.ts`), raw body from `arrayBuffer()` |
| Hono | `hono/` | Minimal API, raw body, health check |
| Express | `express/` | Middleware stack, `express.raw()`, event subscriptions, refunds |

## Next.js Pattern

The Next.js example splits concerns using modern App Router patterns:

### Server Action (`app/checkout/actions.ts`)
```tsx
// Server Component — called from a <form action={...}>
import { initializePayment } from "@/app/checkout/actions";

export function CheckoutForm() {
  return (
    <form action={initializePayment}>
      <input name="amount" type="number" />
      <input name="email" type="email" />
      <input name="reference" type="text" />
      <button type="submit">Pay with Paystack</button>
    </form>
  );
}
```

Initialization and verification use `"use server"` directives — the idiomatic Next.js 14+ way to call server-side code from the client.

### Route Handler (`app/api/webhooks/tec/route.ts`)
```ts
// app/api/webhooks/tec/route.ts
export async function POST(req: Request) { ... }
```

The webhook endpoint must be a Route Handler because Paystack POSTs to a raw URL endpoint. Server Actions have CSRF protection that blocks external callers.

## Running

Each example is self-contained. Copy the relevant files into your project.

All examples require:

```bash
bun add @tec/payment
```

Set environment variables:

```bash
export PAYSTACK_SECRET_KEY=sk_test_your_key
export PAYSTACK_WEBHOOK_SECRET=your_webhook_secret
```
