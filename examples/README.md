# @tec/payment Examples

Example integrations for popular Node.js frameworks.

## Examples

| Framework | Directory | Key Features |
|-----------|-----------|--------------|
| Next.js (App Router) | `nextjs/` | Route handlers, raw body from `arrayBuffer()`, API routes |
| Hono | `hono/` | Minimal API, raw body, health check |
| Express | `express/` | Middleware stack, `express.raw()`, event subscriptions, refunds |

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
