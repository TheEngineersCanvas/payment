import { describe, it, expect } from "vitest";
import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";

import { createPaymentClient } from "../../src/public-api/client.js";
import type { PaymentClient } from "../../src/application/payment-client.js";
import { InMemoryEventBus } from "../../src/infrastructure/event-bus/in-memory-event-bus.js";
import { NoopLogger } from "../../src/infrastructure/logging/noop-logger.js";
import type { PaymentEvent } from "../../src/domain/events/payment-events.js";

const WEBHOOK_SECRET = "whsec_integration_test";

function sign(rawBody: string): string {
  return createHmac("sha512", WEBHOOK_SECRET).update(rawBody).digest("hex");
}

function buildClient(
  eventsReceived?: Array<{ type: string }>,
): PaymentClient {
  const eventBus = new InMemoryEventBus(new NoopLogger());
  if (eventsReceived) {
    eventBus.onAny((event: PaymentEvent) => {
      eventsReceived.push({ type: event.type });
    });
  }

  return createPaymentClient({
    providers: {
      paystack: {
        secretKey: "sk_test_fake",
        webhookSecret: WEBHOOK_SECRET,
      },
    },
    defaultProvider: "paystack",
    eventBus,
  });
}

interface CapturedBody {
  raw: Buffer;
  headers: Record<string, string>;
}

function startRawBodyServer(): Promise<{
  url: string;
  nextBody: () => Promise<CapturedBody>;
  close: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    let pending: {
      resolve: (body: CapturedBody) => void;
    } | null = null;

    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const raw = Buffer.concat(chunks);
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(req.headers)) {
          if (typeof value === "string") headers[key] = value;
          else if (Array.isArray(value)) headers[key] = value.join(", ");
        }

        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ received: true }));

        if (pending) {
          pending.resolve({ raw, headers });
          pending = null;
        }
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as AddressInfo).port;
      resolve({
        url: `http://127.0.0.1:${port}`,
        nextBody: () =>
          new Promise<CapturedBody>((res) => {
            pending = { resolve: res };
          }),
        close: () =>
          new Promise<void>((res) => server.close(() => res())),
      });
    });
  });
}

function makePayload() {
  return JSON.stringify({
    event: "charge.success",
    data: {
      id: 99999,
      reference: "order-e2e",
      status: "success",
      amount: 10000,
      currency: "NGN",
      channel: "card",
      gateway_response: "Successful",
      paid_at: "2026-07-15T12:00:00.000Z",
      created_at: "2026-07-15T11:59:00.000Z",
      updated_at: "2026-07-15T12:00:00.000Z",
      customer: { id: 1, email: "test@example.com", customer_code: "CUS_1" },
      metadata: {},
    },
  });
}

describe("Webhook flow (end-to-end)", () => {
  it("receives, verifies, and normalizes a webhook end-to-end", async () => {
    const server = await startRawBodyServer();
    const client = buildClient();
    const payload = makePayload();
    const signature = sign(payload);

    try {
      const bodyPromise = server.nextBody();
      await fetch(server.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-paystack-signature": signature,
        },
        body: payload,
      });
      const captured = await bodyPromise;

      const result = await client.webhooks.receive({
        rawBody: captured.raw,
        signature: captured.headers["x-paystack-signature"] ?? "",
        headers: captured.headers,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe("payment.succeeded");
        expect(result.value.originalType).toBe("charge.success");
        expect(result.value.provider).toBe("paystack");
        expect(result.value.id).toBeDefined();
      }
    } finally {
      await server.close();
    }
  });

  it("rejects tampered webhook body", async () => {
    const server = await startRawBodyServer();
    const client = buildClient();

    const original = makePayload();
    const tampered = JSON.stringify({
      event: "charge.success",
      data: { id: 999, reference: "r", status: "success", amount: 999999, currency: "NGN", channel: "card",
        gateway_response: "OK", paid_at: "2026-07-15T12:00:00.000Z", created_at: "2026-07-15T11:59:00.000Z",
        updated_at: "2026-07-15T12:00:00.000Z", customer: { id: 99, email: "hax@evil.com", customer_code: "C" }, metadata: {} },
    });

    const signature = sign(original);

    try {
      const bodyPromise = server.nextBody();
      await fetch(server.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-paystack-signature": signature,
        },
        body: tampered,
      });
      const captured = await bodyPromise;

      const result = await client.webhooks.receive({
        rawBody: captured.raw,
        signature: captured.headers["x-paystack-signature"] ?? "",
        headers: captured.headers,
      });

      expect(result.ok).toBe(false);
    } finally {
      await server.close();
    }
  });

  it("emits webhook.received event on the event bus", async () => {
    const server = await startRawBodyServer();
    const eventsReceived: Array<{ type: string }> = [];
    const client = buildClient(eventsReceived);
    const payload = makePayload();
    const signature = sign(payload);

    try {
      const bodyPromise = server.nextBody();
      await fetch(server.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-paystack-signature": signature,
        },
        body: payload,
      });
      const captured = await bodyPromise;

      const result = await client.webhooks.receive({
        rawBody: captured.raw,
        signature: captured.headers["x-paystack-signature"] ?? "",
        headers: captured.headers,
      });

      expect(result.ok).toBe(true);
      expect(eventsReceived.some((e) => e.type === "webhook.received")).toBe(true);
    } finally {
      await server.close();
    }
  });
});
