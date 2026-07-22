import { Controller, UseGuards, Inject } from "@nestjs/common";
import { ThrottlerGuard, Throttle } from "@nestjs/throttler";
import { WebhookController, TEC_PAYMENT_CLIENT } from "@TheEngineersCanvas/payment/nestjs";
import type { PaymentClient } from "@TheEngineersCanvas/payment";

/**
 * Rate-limited webhook controller using @nestjs/throttler.
 *
 * @example
 * **Install:**
 * ```bash
 * bun add @nestjs/throttler
 * ```
 *
 * **Register in your AppModule:**
 * ```ts
 * import { ThrottlerModule } from "@nestjs/throttler";
 * @Module({
 *   imports: [
 *     PaymentModule.forRoot({ ... }, { registerWebhookController: false }),
 *     ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
 *   ],
 *   controllers: [ThrottledWebhookController],
 * })
 * ```
 *
 * Disable the built-in controller with `registerWebhookController: false`
 * and register this class instead.  It extends `WebhookController` so it
 * inherits the HMAC verification logic — only rate limiting is added.
 */
@Controller("webhooks/tec")
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class ThrottledWebhookController extends WebhookController {
  constructor(@Inject(TEC_PAYMENT_CLIENT) client: PaymentClient) {
    super(client);
  }
}
