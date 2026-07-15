import type { ProviderConfig } from "./ports/provider-factory.js";
import type { Logger } from "./ports/logger.js";
import type { Clock } from "./ports/clock.js";
import type { IdGenerator } from "./ports/id-generator.js";
import type { HttpClient } from "./ports/http-client.js";
import type { EventBus } from "./ports/event-bus.js";

export interface LoggingConfig {
  readonly level?: "debug" | "info" | "warn" | "error";
}

export interface HttpClientConfig {
  readonly timeoutMs?: number;
  readonly baseUrl?: string;
}

export interface RetryConfig {
  readonly maxRetries?: number;
  readonly delayMs?: number;
}

export interface PaymentClientConfig {
  readonly providers: Record<string, ProviderConfig>;
  readonly defaultProvider?: string;
  readonly logging?: LoggingConfig;
  readonly http?: HttpClientConfig;
  readonly retry?: RetryConfig;
  readonly eventBus?: EventBus;
  readonly clock?: Clock;
  readonly idGenerator?: IdGenerator;
  readonly logger?: Logger;
  readonly httpClient?: HttpClient;
}
