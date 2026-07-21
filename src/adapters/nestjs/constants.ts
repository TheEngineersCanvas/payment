/**
 * Injection token for the `@tec/payment` {@link PaymentClient} instance.
 *
 * Inject the raw client when you need direct access to the SDK's service
 * facades (`payments`, `refunds`, `webhooks`, `events`, `health`).
 *
 * @example
 * ```ts
 * import { Inject } from "@nestjs/common";
 * import { TEC_PAYMENT_CLIENT } from "@tec/payment/nestjs";
 * import type { PaymentClient } from "@tec/payment";
 *
 * @Injectable()
 * export class MyService {
 *   constructor(@Inject(TEC_PAYMENT_CLIENT) private readonly tec: PaymentClient) {}
 * }
 * ```
 */
export const TEC_PAYMENT_CLIENT = "TEC_PAYMENT_CLIENT";

/**
 * Default path the built-in {@link WebhookController} is registered on.
 *
 * Used as the `@Controller()` prefix. Consumers overriding the route
 * should subclass {@link WebhookController} with their own `@Controller()` decorator.
 */
export const DEFAULT_WEBHOOK_PATH = "webhooks/tec";
