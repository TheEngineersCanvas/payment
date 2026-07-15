import type { Provider } from "../../domain/provider/provider.js";
import type { PaymentProvider, ProviderCapabilities, HealthStatus } from "../ports/payment-provider.js";
import type { ProviderFactory } from "../ports/provider-factory.js";
import type { Logger } from "../ports/logger.js";
import { ConfigurationError } from "../../errors/configuration-error.js";

export class ProviderRegistry {
  constructor(
    private readonly factory: ProviderFactory,
    private readonly providers: ReadonlyMap<Provider, PaymentProvider>,
    private readonly logger: Logger,
  ) {}

  get(id: string): PaymentProvider {
    const provider = id as Provider;
    const instance = this.providers.get(provider);
    if (!instance) {
      const available = [...this.providers.keys()].join(", ") || "none";
      throw new ConfigurationError(
        `Unknown provider "${id}". Available: ${available}`,
      );
    }
    return instance;
  }

  list(): ReadonlyArray<Provider> {
    return this.factory.supported();
  }

  capabilities(id: string): ProviderCapabilities {
    return this.get(id).capabilities;
  }

  async health(id: string): Promise<HealthStatus> {
    return this.get(id).health();
  }
}
