import express from "express";
import { createPaymentClient, Money, PaymentReference } from "@tec/payment";

const app = express();

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
  console.log(`Payment ${event.payment.reference} succeeded — fulfill order`);
});

client.events.on("payment.failed", (event) => {
  console.log(`Payment ${event.payment.reference} failed — notify customer`);
});

app.use(express.json());

app.post("/api/payments/initialize", async (req, res) => {
  const result = await client.payments.initialize({
    amount: Money({ amount: req.body.amount, currency: req.body.currency ?? "NGN" }),
    reference: PaymentReference(req.body.reference),
    customer: { kind: "new", email: req.body.email },
    callbackUrl: req.body.callbackUrl,
    metadata: req.body.metadata,
  });
  if (!result.ok) {
    return res.status(400).json({ error: result.error.message });
  }
  res.json(result.value);
});

app.post(
  "/webhooks/tec",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const result = await client.webhooks.receive({
      rawBody: req.body,
      signature: req.headers["x-paystack-signature"] as string,
      headers: req.headers as Record<string, string>,
    });

    if (!result.ok) {
      return res.status(401).json({ error: result.error.message });
    }

    res.json({ received: true });
  },
);

app.post("/api/payments/:id/refund", async (req, res) => {
  const result = await client.refunds.create({
    paymentId: req.params.id,
    amount: req.body.amount
      ? Money({ amount: req.body.amount, currency: req.body.currency ?? "NGN" })
      : undefined,
    reason: req.body.reason,
  });
  if (!result.ok) {
    return res.status(400).json({ error: result.error.message });
  }
  res.json(result.value);
});

app.get("/health/tec", async (_req, res) => {
  const health = await client.health();
  const allHealthy = health.every((h) => h.healthy);
  res.status(allHealthy ? 200 : 503).json({ healthy: allHealthy, providers: health });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
