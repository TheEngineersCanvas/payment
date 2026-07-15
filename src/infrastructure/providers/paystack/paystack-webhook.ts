import { HmacWebhookVerifier } from "../../webhook/hmac-webhook-verifier.js";
import type { PaystackWebhookEvent } from "./paystack-types.js";
import type { WebhookEvent } from "../../../domain/webhook/webhook-event.js";
import type { Result } from "../../../shared/result/result.js";
import { ok, err } from "../../../shared/result/result.js";
import { WebhookValidationError } from "../../../errors/webhook-validation-error.js";
import { mapPaystackWebhookEvent } from "./paystack-mapper.js";

const SIGNATURE_HEADER = "x-paystack-signature";

export function parsePaystackWebhook(
  headers: Readonly<Record<string, string>>,
  rawBody: string,
  webhookSecret: string,
): Result<WebhookEvent, WebhookValidationError> {
  const signature = findHeader(headers, SIGNATURE_HEADER);

  if (!signature) {
    return err(new WebhookValidationError("Missing x-paystack-signature header"));
  }

  const verifier = new HmacWebhookVerifier(webhookSecret, "sha512");
  if (!verifier.verify(rawBody, signature)) {
    return err(new WebhookValidationError("Invalid webhook signature"));
  }

  let payload: PaystackWebhookEvent;
  try {
    payload = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    return err(new WebhookValidationError("Invalid webhook body: not valid JSON"));
  }

  if (!payload.event || !payload.data) {
    return err(new WebhookValidationError("Invalid webhook body: missing event or data"));
  }

  try {
    const event = mapPaystackWebhookEvent(payload);
    return ok(event);
  } catch (e) {
    return err(new WebhookValidationError(
      `Failed to parse webhook payload: ${e instanceof Error ? e.message : String(e)}`,
    ));
  }
}

function findHeader(
  headers: Readonly<Record<string, string>>,
  name: string,
): string | undefined {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) {
      return headers[key];
    }
  }
  return undefined;
}
