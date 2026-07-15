import "../infrastructure/providers/paystack/register.js";

import type { PaymentClientConfig } from "../application/client-config.js";
import type { PaymentClient } from "../application/payment-client.js";
import { PaymentService } from "../application/services/payment-service.js";
import { RefundService } from "../application/services/refund-service.js";
import { WebhookService } from "../application/services/webhook-service.js";
import { ProviderRegistry } from "../application/services/provider-registry.js";
import { EventSubscriptionView } from "../application/services/event-subscription-view.js";
import { createProviderFactory } from "../infrastructure/providers/provider-factory.js";
import { FetchHttpClient } from "../infrastructure/http/fetch-http-client.js";
import { ConsoleLogger } from "../infrastructure/logging/console-logger.js";
import { NoopLogger } from "../infrastructure/logging/noop-logger.js";
import { SystemClock } from "../infrastructure/clock/system-clock.js";
import { UlidIdGenerator } from "../infrastructure/id/ulid-id-generator.js";
import { InMemoryEventBus } from "../infrastructure/event-bus/in-memory-event-bus.js";
import { HmacWebhookVerifier } from "../infrastructure/webhook/hmac-webhook-verifier.js";
import type { Logger } from "../application/ports/logger.js";
import type { EventBus } from "../application/ports/event-bus.js";
import type { Provider } from "../domain/provider/provider.js";
import type { HealthStatus } from "../application/ports/payment-provider.js";
import type { ProviderFactory, ProviderConfig } from "../application/ports/provider-factory.js";
import { ConfigurationError } from "../errors/configuration-error.js";

function createLogger(config: PaymentClientConfig): Logger {
  if (config.logger) return config.logger;
  if (config.logging?.level === "debug") {
    return new ConsoleLogger({ provider: "tec-payment" });
  }
  return new NoopLogger();
}

export function createPaymentClient(config: PaymentClientConfig): PaymentClient {
  const logger = createLogger(config);

  if (!config.providers || Object.keys(config.providers).length === 0) {
    throw new ConfigurationError("At least one provider must be configured");
  }

  const clock = config.clock ?? new SystemClock();
  const idGenerator = config.idGenerator ?? new UlidIdGenerator();

  const eventBus: EventBus = config.eventBus ?? new InMemoryEventBus(
    logger.child({ component: "event-bus" }),
  );

  const providerFactory = createProviderFactory();

  const providerMap = new Map<Provider, ReturnType<ProviderFactory["create"]>>();

  for (const [providerId, providerConfig] of Object.entries(config.providers)) {
    if (!providerConfig || providerConfig.enabled === false) continue;

    const httpClient = config.httpClient ?? new FetchHttpClient({
      baseUrl: providerConfig.baseUrl,
      defaultTimeoutMs: providerConfig.timeoutMs,
      provider: providerId as Provider,
      logger: logger.child({ provider: providerId }),
    });

    const webhookSecret = (providerConfig.webhookSecret ?? providerConfig.secretKey) as string;
    const webhookVerifier = new HmacWebhookVerifier(webhookSecret, "sha512");

    const provider = providerFactory.create(providerId as Provider, providerConfig, {
      httpClient,
      logger: logger.child({ provider: providerId }),
      clock,
      idGenerator,
      eventBus,
      webhookVerifier,
    });

    providerMap.set(providerId as Provider, provider);
  }

  if (providerMap.size === 0) {
    throw new ConfigurationError("No providers are enabled. Check your configuration.");
  }

  const defaultProviderId = config.defaultProvider
    ? (config.defaultProvider as Provider)
    : (providerMap.keys().next().value as Provider);

  if (!providerMap.has(defaultProviderId)) {
    throw new ConfigurationError(
      `Default provider "${config.defaultProvider}" is not configured or enabled.`,
    );
  }

  const defaultProvider = providerMap.get(defaultProviderId)!;

  const providers = new ProviderRegistry(providerFactory, providerMap, logger);

  const payments = new PaymentService(
    defaultProvider,
    eventBus,
    logger.child({ component: "payment-service" }),
    clock,
    idGenerator,
  );

  const serviceDeps = {
    eventBus,
    logger,
    clock,
    idGenerator,
  };

  const refunds = new RefundService(defaultProvider, serviceDeps);
  const webhooks = new WebhookService(defaultProvider, serviceDeps);
  const events = new EventSubscriptionView(eventBus);

  return {
    payments,
    refunds,
    webhooks,
    events,
    providers,
    async health(): Promise<ReadonlyArray<HealthStatus>> {
      const results: HealthStatus[] = [];
      for (const [id, provider] of providerMap) {
        try {
          results.push(await provider.health());
        } catch {
          results.push({
            healthy: false,
            latencyMs: 0,
            timestamp: clock.now(),
          });
        }
      }
      return results;
    },
  };
}

export function fromEnv(): PaymentClient {
  const defaultProvider = process.env.TEC_PAYMENT_DEFAULT_PROVIDER ?? "paystack";
  const logLevel = (process.env.TEC_PAYMENT_LOGGING_LEVEL ?? "info") as "debug" | "info" | "warn" | "error";

  const providers: Record<string, ProviderConfig> = {};

  if (process.env.TEC_PAYMENT_PAYSTACK_SECRET_KEY) {
    providers.paystack = {
      secretKey: process.env.TEC_PAYMENT_PAYSTACK_SECRET_KEY,
      webhookSecret: process.env.TEC_PAYMENT_PAYSTACK_WEBHOOK_SECRET,
      baseUrl: process.env.TEC_PAYMENT_PAYSTACK_BASE_URL,
    };
  }

  return createPaymentClient({
    providers,
    defaultProvider,
    logging: { level: logLevel },
  });
}

createPaymentClient.fromEnv = fromEnv;
