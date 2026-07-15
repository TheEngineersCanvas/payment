import type { Provider } from "../../domain/provider/provider.js";
import type { PaymentProvider } from "./payment-provider.js";
import type { HttpClient } from "./http-client.js";
import type { Logger } from "./logger.js";
import type { Clock } from "./clock.js";
import type { IdGenerator } from "./id-generator.js";
import type { EventBus } from "./event-bus.js";
import type { WebhookVerifier } from "./webhook-verifier.js";

export interface ProviderConfig {
  readonly secretKey: string;
  readonly publicKey?: string;
  readonly webhookSecret?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly enabled?: boolean;
  readonly options?: Readonly<Record<string, unknown>>;
}

export interface ProviderDeps {
  readonly httpClient: HttpClient;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly eventBus: EventBus;
  readonly webhookVerifier: WebhookVerifier;
}

export interface ProviderFactory {
  create(id: Provider, config: ProviderConfig, deps: ProviderDeps): PaymentProvider;
  supported(): ReadonlyArray<Provider>;
}
