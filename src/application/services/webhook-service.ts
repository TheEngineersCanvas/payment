import type { PaymentProvider } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import type { Clock } from "../ports/clock.js";
import type { EventBus } from "../ports/event-bus.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { WebhookEvent } from "../../domain/webhook/webhook-event.js";
import type { Result } from "../../shared/result/result.js";
import type { WebhookValidationError } from "../../errors/webhook-validation-error.js";
import { parseWebhook } from "../use-cases/parse-webhook.js";

export interface WebhookInput {
  readonly provider?: string;
  readonly rawBody: string | Buffer;
  readonly signature: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export class WebhookService {
  private readonly provider: PaymentProvider;
  private readonly eventBus: EventBus;
  private readonly logger: Logger;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;

  constructor(
    provider: PaymentProvider,
    deps: {
      readonly eventBus: EventBus;
      readonly logger: Logger;
      readonly clock: Clock;
      readonly idGenerator: IdGenerator;
    },
  ) {
    this.provider = provider;
    this.eventBus = deps.eventBus;
    this.logger = deps.logger;
    this.clock = deps.clock;
    this.idGenerator = deps.idGenerator;
  }

  async receive(
    input: WebhookInput,
  ): Promise<Result<WebhookEvent, WebhookValidationError>> {
    return parseWebhook(
      {
        provider: this.provider,
        eventBus: this.eventBus,
        logger: this.logger.child({ component: "webhook-service" }),
        clock: this.clock,
        idGenerator: this.idGenerator,
      },
      input,
    );
  }
}
