import {
  Module,
  type DynamicModule,
  type FactoryProvider,
  type ModuleMetadata,
} from "@nestjs/common";
import {
  createPaymentClient,
  type PaymentClient,
  type PaymentClientConfig,
} from "../../public-api/index.js";
import { TEC_PAYMENT_CLIENT } from "./constants.js";
import { PaymentService } from "./payment.service.js";
import { WebhookController } from "./webhook.controller.js";

export { TEC_PAYMENT_CLIENT, DEFAULT_WEBHOOK_PATH } from "./constants.js";

export interface PaymentModuleOptions {
  registerWebhookController?: boolean;
}

export interface PaymentModuleAsyncOptions
  extends Pick<ModuleMetadata, "imports"> {
  useFactory: (...args: any[]) => PaymentClientConfig | Promise<PaymentClientConfig>;
  inject?: FactoryProvider["inject"];
  registerWebhookController?: boolean;
}

function createPaymentClientFactory(
  config: PaymentClientConfig,
): FactoryProvider["useFactory"] {
  return () => createPaymentClient(config);
}

function createAsyncPaymentClientFactory(
  options: PaymentModuleAsyncOptions,
): FactoryProvider["useFactory"] {
  return async (...args: any[]) => {
    const config = await options.useFactory(...args);
    return createPaymentClient(config);
  };
}

const EXPORTED_PROVIDERS = [TEC_PAYMENT_CLIENT, PaymentService];

@Module({})
export class PaymentModule {
  static forRoot(
    config: PaymentClientConfig,
    options?: PaymentModuleOptions,
  ): DynamicModule {
    const shouldRegisterController =
      options?.registerWebhookController === undefined
        ? true
        : options.registerWebhookController;

    const providers: Array<FactoryProvider> = [
      {
        provide: TEC_PAYMENT_CLIENT,
        useFactory: createPaymentClientFactory(config),
      },
      {
        provide: PaymentService,
        useFactory: (client: PaymentClient) => new PaymentService(client),
        inject: [TEC_PAYMENT_CLIENT],
      },
    ];

    const controllers: Array<{ new (...args: any[]): unknown }> = [];
    if (shouldRegisterController) {
      providers.push({
        provide: WebhookController,
        useFactory: (client: PaymentClient) => new WebhookController(client),
        inject: [TEC_PAYMENT_CLIENT],
      });
      controllers.push(WebhookController);
    }

    return {
      module: PaymentModule,
      providers,
      exports: [...EXPORTED_PROVIDERS],
      controllers,
    };
  }

  static forRootAsync(options: PaymentModuleAsyncOptions): DynamicModule {
    const shouldRegisterController =
      options.registerWebhookController === undefined
        ? true
        : options.registerWebhookController;

    const providers: Array<FactoryProvider> = [
      {
        provide: TEC_PAYMENT_CLIENT,
        useFactory: createAsyncPaymentClientFactory(options),
        inject: options.inject ?? [],
      },
      {
        provide: PaymentService,
        useFactory: (client: PaymentClient) => new PaymentService(client),
        inject: [TEC_PAYMENT_CLIENT],
      },
    ];

    const controllers: Array<{ new (...args: any[]): unknown }> = [];
    if (shouldRegisterController) {
      providers.push({
        provide: WebhookController,
        useFactory: (client: PaymentClient) => new WebhookController(client),
        inject: [TEC_PAYMENT_CLIENT],
      });
      controllers.push(WebhookController);
    }

    return {
      module: PaymentModule,
      imports: [...(options.imports ?? [])],
      providers,
      exports: [...EXPORTED_PROVIDERS],
      controllers,
    };
  }
}
