import { Controller, Inject, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";
import {
  PaymentModule,
  TEC_PAYMENT_CLIENT,
  PaymentService,
  WebhookController,
  DEFAULT_WEBHOOK_PATH,
  NestLoggerAdapter,
} from "./index.js";
import {
  createPaymentClient,
  type PaymentClient,
  type PaymentClientConfig,
} from "../../public-api/index.js";

const WEBHOOK_SECRET = "whsec_fake";

function createTestConfig(): PaymentClientConfig {
  return {
    providers: {
      paystack: {
        secretKey: "sk_test_fake",
        webhookSecret: WEBHOOK_SECRET,
        baseUrl: "https://api.paystack.co",
      },
    },
    defaultProvider: "paystack",
  };
}

function makeRealClient(): PaymentClient {
  return createPaymentClient(createTestConfig());
}

function signPayload(payload: string): string {
  return createHmac("sha512", WEBHOOK_SECRET).update(payload).digest("hex");
}

function validWebhookBody(): string {
  return JSON.stringify({
    event: "charge.success",
    data: {
      id: 123,
      status: "success",
      reference: "ref-1",
      amount: 5000,
      currency: "NGN",
      channel: "card",
      customer: { id: 1, email: "test@test.com" },
    },
  });
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

      const body = validWebhookBody();
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await controller.handle(
        {
          rawBody: Buffer.from(body),
          headers: {
            "x-paystack-signature": signPayload(body),
            "content-type": "application/json",
          },
        },
        res,
      );

      expect(res.json).toHaveBeenCalledWith({ received: true });
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

    it("accepts a valid HMAC-signed webhook and returns { received: true }", async () => {
      const client = makeRealClient();
      const controller = new WebhookController(client);

      const body = validWebhookBody();
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await controller.handle(
        {
          rawBody: Buffer.from(body),
          headers: {
            "x-paystack-signature": signPayload(body),
            "content-type": "application/json",
          },
        },
        res,
      );

      expect(res.json).toHaveBeenCalledWith({ received: true });
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

    it("returns 401 when rawBody is undefined", async () => {
      const client = makeRealClient();
      const controller = new WebhookController(client);
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await controller.handle({}, res);

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

      const body = validWebhookBody();
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await controller.handle(
        {
          rawBody: Buffer.from(body),
          headers: {
            "x-paystack-signature": signPayload(body),
            "content-type": "application/json",
          },
        },
        res,
      );

      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  describe("NestLoggerAdapter", () => {
    it("implements the SDK Logger interface", () => {
      const adapter = new NestLoggerAdapter("Test");
      expect(typeof adapter.debug).toBe("function");
      expect(typeof adapter.info).toBe("function");
      expect(typeof adapter.warn).toBe("function");
      expect(typeof adapter.error).toBe("function");
      expect(typeof adapter.child).toBe("function");
      const child = adapter.child({ component: "test" });
      expect(typeof child.debug).toBe("function");
    });
  });
});
