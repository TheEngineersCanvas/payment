import type { EventBase } from "./event-base.js";

export interface WebhookReceived extends EventBase {
  readonly type: "webhook.received";
  readonly provider: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly originalType: string;
  readonly payload: Readonly<Record<string, unknown>>;
}
