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

/**
 * Options for {@link PaymentModule.forRoot}.
 */
export interface PaymentModuleOptions {
  /**
   * Whether the built-in {@link WebhookController} is registered.
   *
   * Set to `false` when you need a custom webhook path. Register your
   * own subclass of {@link WebhookController} with a different
   * `@Controller()` decorator instead.
   *
   * @default true
   */
  registerWebhookController?: boolean;
}

/**
 * Async options for {@link PaymentModule.forRootAsync}.
 */
export interface PaymentModuleAsyncOptions
  extends Pick<ModuleMetadata, "imports"> {
  /**
   * Factory returning a {@link PaymentClientConfig}, typically resolving
   * secrets from `ConfigService` or a similar async provider.
   */
  useFactory: (...args: any[]) => PaymentClientConfig | Promise<PaymentClientConfig>;
  /**
   * Injection tokens passed to `useFactory`.
   */
  inject?: FactoryProvider["inject"];
  /**
   * @inheritdoc
   *
   * @default true
   */
  registerWebhookController?: boolean;
}

/**
 * Factory providers instantiate service and controller classes explicitly
 * rather than relying on Nest's decorator-based DI.  This keeps the adapter
 * compatible with build tools (esbuild / vitest) that do not emit
 * `design:paramtypes` metadata.  In a project with `emitDecoratorMetadata`
 * enabled (e.g. a Nest CLI scaffold), switching to class providers is safe.
 */

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

/**
 * NestJS dynamic module integrating `@tec/payment` into the DI container.
 *
 * Registers {@link PaymentService} and the raw {@link PaymentClient}
 * behind the {@link TEC_PAYMENT_CLIENT} injection token.  The built-in
 * {@link WebhookController} is registered at
 * {@link DEFAULT_WEBHOOK_PATH} unless opted out.
 *
 * **Static configuration:**
 *
 * ```ts
 * PaymentModule.forRoot({
 *   providers: { paystack: { secretKey: "sk_..." } },
 *   defaultProvider: "paystack",
 * });
 * ```
 *
 * **Async configuration (e.g. from ConfigService):**
 *
 * ```ts
 * PaymentModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService) => ({
 *     providers: { paystack: { secretKey: config.get("PAYSTACK_KEY")! } },
 *   }),
 *   inject: [ConfigService],
 * });
 * ```
 *
 * **Opting out of the built-in webhook controller:**
 *
 * ```ts
 * PaymentModule.forRoot(config, { registerWebhookController: false });
 * ```
 */
@Module({})
export class PaymentModule {
  /**
   * Registers a {@link PaymentClient} synchronously from a static
   * {@link PaymentClientConfig}.
   */
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

  /**
   * Registers a {@link PaymentClient} asynchronously, typically
   * pulling secrets from `ConfigService` or a similar provider.
   */
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
