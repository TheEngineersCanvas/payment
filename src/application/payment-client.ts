import type { PaymentService } from "./services/payment-service.js";
import type { RefundService } from "./services/refund-service.js";
import type { WebhookService } from "./services/webhook-service.js";
import type { ProviderRegistry } from "./services/provider-registry.js";
import type { EventSubscriptionView } from "./services/event-subscription-view.js";
import type { HealthStatus } from "./ports/payment-provider.js";

export interface PaymentClient {
  readonly payments: PaymentService;
  readonly refunds: RefundService;
  readonly webhooks: WebhookService;
  readonly events: EventSubscriptionView;
  readonly providers: ProviderRegistry;
  health(): Promise<ReadonlyArray<HealthStatus>>;
}
