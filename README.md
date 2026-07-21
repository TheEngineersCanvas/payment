# @TheEngineersCanvas/payment

Framework-agnostic payment abstraction SDK by TheEngineersCanvas.

Provider-agnostic TypeScript SDK for payment processing. One API, any provider.

## Install

```bash
bun add @TheEngineersCanvas/payment

or

npm install @TheEngineersCanvas/payment
```

## Quickstart

```ts
import { createPaymentClient, Money, PaymentReference } from "@TheEngineersCanvas/payment";

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
  redirect(result.value.authorizationUrl);
}

// Verify
const verified = await tec.payments.verify(PaymentReference("order-9001"));

// Events
tec.events.on("payment.succeeded", (event) => {
  console.log("Payment succeeded:", event.payment.reference);
});

// Webhooks (Express example)
app.post("/webhooks/tec", express.raw({ type: "application/json" }), async (req, res) => {
  const result = await tec.webhooks.receive({
    rawBody: req.body,
    signature: req.headers["x-paystack-signature"] as string,
    headers: req.headers as Record<string, string>,
  });
  if (!result.ok) return res.status(401).json({ error: result.error.message });
  res.json({ received: true });
});

// Refunds
const refundResult = await tec.refunds.create({
  paymentId: "3811142484",
  reason: "Customer requested refund",
});

// Health
const health = await tec.health();
```

### NestJS

```ts
import { PaymentModule } from "@TheEngineersCanvas/payment/nestjs";

@Module({
  imports: [
    PaymentModule.forRoot({
      providers: {
        paystack: { secretKey: process.env.PAYSTACK_SECRET_KEY! },
      },
      defaultProvider: "paystack",
    }),
  ],
})
export class AppModule {}
```

**Async configuration** (e.g. from `@nestjs/config`):

```ts
PaymentModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    providers: {
      paystack: { secretKey: config.getOrThrow("PAYSTACK_SECRET_KEY") },
    },
    logger: new NestLoggerAdapter("PaymentClient"),
  }),
  inject: [ConfigService],
});
```

Then inject `PaymentService` (idiomatic) or the raw client via `@Inject(TEC_PAYMENT_CLIENT)`:

```ts
import { PaymentService } from "@TheEngineersCanvas/payment/nestjs";

@Injectable()
export class MyService {
  constructor(private readonly tec: PaymentService) {}

  async createPayment() {
    const result = await this.tec.payments.initialize({ ... });
  }
}
```

**Webhooks:** The module registers a `WebhookController` at `POST /webhooks/tec`
by default. To use it **you must enable raw body capture** in `main.ts`:

```ts
const app = await NestFactory.create(AppModule, { rawBody: true });
```

Without this, `req.rawBody` is `undefined` and webhook signature verification
will fail silently. To disable the built-in controller and provide your own:

```ts
// main.ts — disable built-in controller
@Module({
  imports: [
    PaymentModule.forRoot(config, { registerWebhookController: false }),
  ],
})
export class AppModule {}

// custom webhook controller with explicit constructor forwarding
import { WebhookController, TEC_PAYMENT_CLIENT } from "@TheEngineersCanvas/payment/nestjs";
import type { PaymentClient } from "@TheEngineersCanvas/payment";

@Controller("webhooks/my-path")
export class MyController extends WebhookController {
  constructor(@Inject(TEC_PAYMENT_CLIENT) client: PaymentClient) {
    super(client);
  }
}
```

## Supported Providers

| Provider | Status |
|----------|--------|
| Paystack | Live — payments, webhooks, refunds |

## Documentation

- **[Public API Reference](docs/public-api.md)** — Complete type and method reference
- **[Architecture](docs/architecture.md)** — Hexagonal architecture overview
- **[Security](docs/security.md)** — Threat model, webhook verification, secret handling
- **[Extension Guide](docs/extension-guide.md)** — Adding providers, custom components
- **[Provider Guide](docs/provider-guide.md)** — Implementing a new provider adapter
- **[Migration Guide](docs/migration-guide.md)** — Migrating from direct provider SDK usage
- **[Versioning](docs/versioning.md)** — Semantic versioning and stability guarantees
- **[Performance](docs/performance.md)** — Performance characteristics and benchmarks
- **[Concurrency](docs/concurrency.md)** — Thread safety and concurrency model
- **[API Stability](docs/api-stability.md)** — Public API guarantees and deprecation policy

## Examples

- [Next.js (App Router)](examples/nextjs/route.ts)
- [Hono](examples/hono/index.ts)
- [Express](examples/express/index.ts)
- [NestJS](examples/nestjs/)

## Key Features

- **One API, any provider.** Switch providers without changing application code.
- **Zero runtime dependencies.** `crypto`, `fetch`, `URL` — nothing else.
- **Result-over-exceptions.** `Result<T, E>` discriminated unions for type-safe error handling.
- **Branded primitives.** `Money`, `PaymentReference`, `Provider` validated at construction.
- **Domain events.** In-process pub/sub for reacting to payment state changes.
- **Framework-agnostic.** Works with Next.js, Hono, Express, NestJS, or any Node.js framework.
- **TypeScript-first.** Full type safety with discriminated unions and exhaustive pattern matching.

## Development

```bash
bun install
bun run check-types    # tsc --noEmit
bun run lint           # ESLint with architectural boundaries
bun run test           # vitest (unit + contract + integration)
bun run test:coverage  # vitest with v8 coverage
bun run build          # tsup (ESM + CJS + d.ts)
bun run verify         # Full pipeline: types → lint → test → build
```

## Version Policy

This project follows [Semantic Versioning](https://semver.org). Only exports from `src/public-api/index.ts` carry backward-compatibility guarantees. See [docs/versioning.md](docs/versioning.md) for details.

## License

UNLICENSED — Proprietary software by TheEngineersCanvas.
