import type { Provider } from "../provider/provider.js";

export interface WebhookEvent {
  readonly id: string;
  readonly provider: Provider;
  readonly type: string;
  readonly originalType: string;
  readonly createdAt: Date;
  readonly receivedAt: Date;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly raw: Readonly<Record<string, unknown>>;
}
