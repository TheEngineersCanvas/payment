import type { PaymentProvider } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import type { Clock } from "../ports/clock.js";
import type { EventBus } from "../ports/event-bus.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { WebhookEvent } from "../../domain/webhook/webhook-event.js";
import type { Result } from "../../shared/result/result.js";
import { err, ok } from "../../shared/result/result.js";
import { WebhookValidationError } from "../../errors/webhook-validation-error.js";

export interface ParseWebhookDeps {
  readonly provider: PaymentProvider;
  readonly eventBus: EventBus;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

export interface ParseWebhookInput {
  readonly rawBody: string | Buffer;
  readonly signature: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export async function parseWebhook(
  deps: ParseWebhookDeps,
  input: ParseWebhookInput,
): Promise<Result<WebhookEvent, WebhookValidationError>> {
  deps.logger.info("use-case: parseWebhook", {
    provider: deps.provider.id,
  });

  let bodyString: string;

  if (typeof input.rawBody === "string") {
    bodyString = input.rawBody;
  } else {
    const converted = tryConvertBuffer(input.rawBody);
    if (!converted.ok) return converted;
    bodyString = converted.value;
  }

  const result = await deps.provider.parseWebhook(
    input.headers ?? {},
    bodyString,
  );

  if (!result.ok) {
    deps.logger.warn("use-case: parseWebhook failed", {
      provider: deps.provider.id,
      error: result.error.message,
    });
    return result;
  }

  const event = result.value;

  deps.eventBus.emit({
    type: "webhook.received",
    provider: event.provider,
    eventId: event.id,
    eventType: event.type,
    originalType: event.originalType,
    payload: event.payload,
    occurredAt: deps.clock.now(),
    correlationId: deps.idGenerator.generate(),
  });

  return result;
}

function tryConvertBuffer(body: Buffer): Result<string, WebhookValidationError> {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    return ok(decoder.decode(body));
  } catch {
    return err(new WebhookValidationError("Invalid webhook body: not valid UTF-8"));
  }
}
