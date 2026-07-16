import type { PaymentProvider } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import type { Clock } from "../ports/clock.js";
import type { EventBus } from "../ports/event-bus.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { WebhookEvent } from "../../domain/webhook/webhook-event.js";
import { err, type Result } from "../../shared/result/result.js";
import { WebhookValidationError as WebhookValidationErrorClass, type WebhookValidationError } from "../../errors/webhook-validation-error.js";
import { parseWebhook } from "../use-cases/parse-webhook.js";
import type { Provider } from "../../domain/provider/provider.js";

export interface WebhookInput {
  readonly provider?: string;
  readonly rawBody: string | Buffer;
  readonly signature: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export class WebhookService {
  private readonly providers: ReadonlyMap<Provider, PaymentProvider>;
  private readonly eventBus: EventBus;
  private readonly logger: Logger;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;

  constructor(
    providers: ReadonlyMap<Provider, PaymentProvider>,
    deps: {
      readonly eventBus: EventBus;
      readonly logger: Logger;
      readonly clock: Clock;
      readonly idGenerator: IdGenerator;
    },
  ) {
    this.providers = providers;
    this.eventBus = deps.eventBus;
    this.logger = deps.logger;
    this.clock = deps.clock;
    this.idGenerator = deps.idGenerator;
  }

  async receive(
    input: WebhookInput,
  ): Promise<Result<WebhookEvent, WebhookValidationError>> {
    const deps = {
      eventBus: this.eventBus,
      logger: this.logger.child({ component: "webhook-service" }),
      clock: this.clock,
      idGenerator: this.idGenerator,
    };

    if (input.provider) {
      const provider = this.providers.get(input.provider as Provider);
      if (!provider) {
        return err(new WebhookValidationErrorClass(
          `Unknown provider: ${input.provider}`,
        ));
      }
      return parseWebhook({ ...deps, provider }, input);
    }

    const errors: WebhookValidationError[] = [];
    for (const [id, provider] of this.providers) {
      this.logger.debug("trying webhook provider", { provider: id });
      const result = await parseWebhook({ ...deps, provider }, input);
      if (result.ok) {
        this.logger.info("webhook matched provider", { provider: id });
        return result;
      }
      if (!result.ok) {
        errors.push(result.error);
      }
    }

    this.logger.warn("webhook rejected by all providers", {
      count: this.providers.size,
      errorMessages: errors.map((e) => e.message).join(", "),
    });

    return err(new WebhookValidationErrorClass(
      `Webhook rejected by all ${this.providers.size} configured provider(s)`,
    ));
  }
}
