import { Inject, Injectable } from "@nestjs/common";
import type { PaymentClient, HealthStatus } from "../../public-api/index.js";
import { TEC_PAYMENT_CLIENT } from "./constants.js";

/**
 * Injectable NestJS service wrapping the `@TheEngineersCanvas/payment` client.
 *
 * Delegates every sub-service (`payments`, `refunds`, `webhooks`,
 * `events`, `health`) directly to the underlying {@link PaymentClient}.
 * {@link https://www.npmjs.com/package/@TheEngineersCanvas/payment Result} objects
 * are returned as-is — the consuming application decides how to handle
 * success and failure cases.
 *
 * @example
 * ```ts
 * import { PaymentService } from "@TheEngineersCanvas/payment/nestjs";
 * import { Money, PaymentReference } from "@TheEngineersCanvas/payment";
 *
 * @Injectable()
 * export class CheckoutService {
 *   constructor(private readonly tec: PaymentService) {}
 *
 *   async checkout(amount: number, email: string) {
 *     const result = await this.tec.payments.initialize({
 *       amount: Money({ amount, currency: "NGN" }),
 *       reference: PaymentReference(`order-${Date.now()}`),
 *       customer: { kind: "new", email },
 *       callbackUrl: "https://myapp.com/verify",
 *     });
 *     if (!result.ok) return { error: result.error.message };
 *     return { url: result.value.authorizationUrl };
 *   }
 * }
 * ```
 */
@Injectable()
export class PaymentService {
  constructor(
    @Inject(TEC_PAYMENT_CLIENT) private readonly client: PaymentClient,
  ) {}

  get payments(): PaymentClient["payments"] {
    return this.client.payments;
  }

  get refunds(): PaymentClient["refunds"] {
    return this.client.refunds;
  }

  get webhooks(): PaymentClient["webhooks"] {
    return this.client.webhooks;
  }

  get events(): PaymentClient["events"] {
    return this.client.events;
  }

  health(): Promise<ReadonlyArray<HealthStatus>> {
    return this.client.health();
  }
}
