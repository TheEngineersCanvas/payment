import type { Provider } from "../../domain/provider/provider.js";
import type { PaymentProvider } from "../../application/ports/payment-provider.js";
import type { ProviderFactory, ProviderConfig, ProviderDeps } from "../../application/ports/provider-factory.js";
import { ConfigurationError } from "../../errors/configuration-error.js";

type ProviderConstructor = (config: ProviderConfig, deps: ProviderDeps) => PaymentProvider;

const registry = new Map<Provider, ProviderConstructor>();

export function registerProvider(id: Provider, factory: ProviderConstructor): void {
  if (registry.has(id)) {
    throw new ConfigurationError(`Provider "${id}" is already registered`);
  }
  registry.set(id, factory);
}

export function createProviderFactory(): ProviderFactory {
  return {
    create(id: Provider, config: ProviderConfig, deps: ProviderDeps): PaymentProvider {
      const factory = registry.get(id);
      if (!factory) {
        throw new ConfigurationError(
          `Unknown provider "${id}". Available providers: ${[...registry.keys()].join(", ") || "none"}`,
        );
      }
      if (config.enabled === false) {
        throw new ConfigurationError(`Provider "${id}" is disabled in configuration`);
      }
      return factory(config, deps);
    },

    supported(): ReadonlyArray<Provider> {
      return [...registry.keys()];
    },
  };
}
