import { Controller, Inject, Post, Req, Res, type LoggerService } from "@nestjs/common";
import type { PaymentClient } from "../../public-api/index.js";
import { TEC_PAYMENT_CLIENT, DEFAULT_WEBHOOK_PATH } from "./constants.js";
import type { RawBodyRequest } from "./raw-body-request.js";

/**
 * Built-in webhook endpoint registered at `POST /webhooks/tec`.
 *
 * **IMPORTANT:** Consumers **must** enable raw body capture in `main.ts`:
 *
 * ```ts
 * const app = await NestFactory.create(AppModule, { rawBody: true });
 * ```
 *
 * Without this, `req.rawBody` is `undefined` and every webhook will be
 * rejected with a 401.
 *
 * Disable this controller by passing `{ registerWebhookController: false }`
 * to {@link PaymentModule.forRoot} and register your own subclass:
 *
 * ```ts
 * @Controller("webhooks/my-path")
 * class MyController extends WebhookController {
 *   constructor(@Inject(TEC_PAYMENT_CLIENT) client: PaymentClient) {
 *     super(client);
 *   }
 * }
 * ```
 */
@Controller(DEFAULT_WEBHOOK_PATH)
export class WebhookController {
  private readonly logger: LoggerService | undefined;

  constructor(
    @Inject(TEC_PAYMENT_CLIENT) private readonly client: PaymentClient,
    logger?: LoggerService,
  ) {
    this.logger = logger;
  }

  /**
   * Receives a provider webhook, verifies its signature, and emits the
   * corresponding domain event via the configured event bus.
   *
   * The signature header name is not enforced here — the underlying
   * {@link WebhookService.receive} performs a try-all over every
   * configured provider, so multi-provider setups work correctly as
   * long as the full `headers` map is forwarded.
   */
  @Post()
  async handle(@Req() req: RawBodyRequest, @Res() res: unknown): Promise<void> {
    const typedRes = res as {
      status: (code: number) => { json: (body: unknown) => void };
      json: (body: unknown) => void;
    };

    const signature =
      (req.headers?.["x-paystack-signature"] as string | undefined) ?? "";

    const rawBody = req.rawBody ?? "";

    const result = await this.client.webhooks.receive({
      rawBody,
      signature,
      headers: req.headers,
    });

    if (!result.ok) {
      this.logger?.warn(
        `Webhook signature verification failed: ${result.error.message}`,
        { error: result.error.meta },
      );
      typedRes.status(401).json({ error: result.error.message });
      return;
    }

    this.logger?.log(`Webhook received: ${result.value.type}`, {
      provider: result.value.provider,
      type: result.value.type,
      originalType: result.value.originalType,
      eventId: result.value.id,
    });
    typedRes.json({ received: true });
  }
}
