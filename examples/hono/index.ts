import { Hono } from "hono";
import { createPaymentClient, Money, PaymentReference } from "@TheEngineersCanvas/payment";

const app = new Hono();

const client = createPaymentClient({
  providers: {
    paystack: {
      secretKey: process.env.PAYSTACK_SECRET_KEY!,
      webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
    },
  },
  defaultProvider: "paystack",
});

client.events.on("payment.succeeded", (event) => {
  console.log(`Payment ${event.payment.reference} succeeded`);
});

app.post("/api/payments/initialize", async (c) => {
  const body = await c.req.json();
  const result = await client.payments.initialize({
    amount: Money({ amount: body.amount, currency: body.currency ?? "NGN" }),
    reference: PaymentReference(body.reference),
    customer: { kind: "new", email: body.email },
    callbackUrl: body.callbackUrl,
  });
  if (!result.ok) {
    return c.json({ error: result.error.message }, 400);
  }
  return c.json(result.value);
});

app.get("/api/payments/verify/:reference", async (c) => {
  const reference = PaymentReference(c.req.param("reference"));
  const result = await client.payments.verify(reference);
  if (!result.ok) {
    return c.json({ error: result.error.message }, 400);
  }
  return c.json(result.value);
});

app.post("/webhooks/tec", async (c) => {
  const rawBody = Buffer.from(await c.req.arrayBuffer());
  const sig = c.req.header("x-paystack-signature") ?? "";

  const result = await client.webhooks.receive({
    rawBody,
    signature: sig,
    headers: c.req.header(),
  });

  if (!result.ok) {
    return c.json({ error: result.error.message }, 401);
  }
  return c.json({ received: true });
});

app.get("/health/tec", async (c) => {
  const health = await client.health();
  const allHealthy = health.every((h) => h.healthy);
  return c.json({ healthy: allHealthy, providers: health }, allHealthy ? 200 : 503);
});

export default app;
