import { Controller, Inject, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi } from "vitest";
import {
  PaymentModule,
  TEC_PAYMENT_CLIENT,
  PaymentService,
  WebhookController,
  DEFAULT_WEBHOOK_PATH,
} from "./index.js";
import {
  createPaymentClient,
  type PaymentClient,
  type PaymentClientConfig,
} from "../../public-api/index.js";

function createTestConfig(): PaymentClientConfig {
  return {
    providers: {
      paystack: {
        secretKey: "sk_test_fake",
        webhookSecret: "whsec_fake",
        baseUrl: "https://api.paystack.co",
      },
    },
    defaultProvider: "paystack",
  };
}

function makeRealClient(): PaymentClient {
  return createPaymentClient(createTestConfig());
}

describe("PaymentModule", () => {
  describe("forRoot", () => {
    it("returns a DynamicModule with correct structure", () => {
      const mod = PaymentModule.forRoot(createTestConfig());
      expect(mod.module).toBe(PaymentModule);
      expect(mod.exports).toContain(TEC_PAYMENT_CLIENT);
      expect(mod.exports).toContain(PaymentService);
    });

    it("registers WebhookController by default", () => {
      const mod = PaymentModule.forRoot(createTestConfig());
      expect(mod.controllers).toContain(WebhookController);
    });

    it("provides a working PaymentClient via DI", async () => {
      const mod = await Test.createTestingModule({
        imports: [PaymentModule.forRoot(createTestConfig())],
      }).compile();

      const client: PaymentClient = mod.get(TEC_PAYMENT_CLIENT);
      expect(client).toBeDefined();
      expect(client.payments).toBeDefined();
      expect(client.refunds).toBeDefined();
      expect(client.webhooks).toBeDefined();
      expect(typeof client.health).toBe("function");
    });

    it("provides PaymentService with working client proxy", async () => {
      const mod = await Test.createTestingModule({
        imports: [PaymentModule.forRoot(createTestConfig())],
      }).compile();

      const service = mod.get(PaymentService);
      expect(service.payments).toBeDefined();
      expect(service.refunds).toBeDefined();
      expect(service.webhooks).toBeDefined();
      expect(service.events).toBeDefined();
      expect(typeof service.health).toBe("function");
    });

    it("provides WebhookController via DI with working handler", async () => {
      const mod = await Test.createTestingModule({
        imports: [PaymentModule.forRoot(createTestConfig())],
      }).compile();

      const controller = mod.get(WebhookController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(WebhookController);

      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await controller.handle(
        {
          rawBody: Buffer.from(JSON.stringify({ event: "charge.success" })),
          headers: {
            "x-paystack-signature": "some-sig",
            "content-type": "application/json",
          },
        },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
      );
    });

    it("skips WebhookController when registerWebhookController is false", () => {
      const mod = PaymentModule.forRoot(createTestConfig(), {
        registerWebhookController: false,
      });
      expect(mod.controllers).toEqual([]);
    });

    it("registers WebhookController when registerWebhookController is true", () => {
      const mod = PaymentModule.forRoot(createTestConfig(), {
        registerWebhookController: true,
      });
      expect(mod.controllers).toContain(WebhookController);
    });
  });

  describe("forRootAsync", () => {
    it("returns a DynamicModule with correct structure", () => {
      const mod = PaymentModule.forRootAsync({
        useFactory: () => createTestConfig(),
      });
      expect(mod.module).toBe(PaymentModule);
      expect(mod.exports).toContain(TEC_PAYMENT_CLIENT);
      expect(mod.exports).toContain(PaymentService);
      expect(mod.controllers).toContain(WebhookController);
    });

    it("provides a working PaymentClient via DI", async () => {
      const mod = await Test.createTestingModule({
        imports: [
          PaymentModule.forRootAsync({
            useFactory: () => createTestConfig(),
          }),
        ],
      }).compile();

      const client: PaymentClient = mod.get(TEC_PAYMENT_CLIENT);
      expect(client).toBeDefined();
      expect(client.payments).toBeDefined();
    });

    it("supports inject and forwards deps to useFactory", async () => {
      @Module({})
      class ConfigHost {
        static register() {
          return {
            module: ConfigHost,
            providers: [
              {
                provide: "PAYMENT_CONFIG",
                useValue: createTestConfig(),
              },
            ],
            exports: ["PAYMENT_CONFIG"],
          };
        }
      }

      const mod = await Test.createTestingModule({
        imports: [
          PaymentModule.forRootAsync({
            imports: [ConfigHost.register()],
            useFactory: (cfg: PaymentClientConfig) => cfg,
            inject: ["PAYMENT_CONFIG"],
          }),
        ],
      }).compile();

      const client: PaymentClient = mod.get(TEC_PAYMENT_CLIENT);
      expect(client).toBeDefined();
    });

    it("skips WebhookController when registerWebhookController is false", () => {
      const mod = PaymentModule.forRootAsync({
        useFactory: () => createTestConfig(),
        registerWebhookController: false,
      });
      expect(mod.controllers).toEqual([]);
    });
  });

  describe("WebhookController", () => {
    it("is instantiable and has DEFAULT_WEBHOOK_PATH as its path", () => {
      expect(DEFAULT_WEBHOOK_PATH).toBe("webhooks/tec");
      const controller = new WebhookController(makeRealClient());
      expect(controller).toBeDefined();
    });

    it("returns 401 on webhook validation failure", async () => {
      const client = makeRealClient();
      const controller = new WebhookController(client);
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await controller.handle(
        {
          rawBody: "invalid-body",
          headers: {
            "x-paystack-signature": "bad-sig",
          },
        },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
      );
    });

    it("returns 401 when signature header is missing", async () => {
      const client = makeRealClient();
      const controller = new WebhookController(client);
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await controller.handle(
        {
          rawBody: Buffer.from(JSON.stringify({ event: "charge.success" })),
          headers: {},
        },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("subclass resolves via Nest DI with explicit constructor forwarding", async () => {
      @Controller("webhooks/my-path")
      class MyController extends WebhookController {
        constructor(@Inject(TEC_PAYMENT_CLIENT) client: PaymentClient) {
          super(client);
        }
      }

      @Module({
        imports: [
          PaymentModule.forRoot(createTestConfig(), {
            registerWebhookController: false,
          }),
        ],
        providers: [
          {
            provide: MyController,
            useFactory: (client: PaymentClient) => new MyController(client),
            inject: [TEC_PAYMENT_CLIENT],
          },
        ],
      })
      class TestHost {}

      const mod = await Test.createTestingModule({
        imports: [TestHost],
      }).compile();

      const controller = mod.get(MyController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(WebhookController);

      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await controller.handle(
        {
          rawBody: Buffer.from(JSON.stringify({ event: "charge.success" })),
          headers: {
            "x-paystack-signature": "some-sig",
            "content-type": "application/json",
          },
        },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });
});
