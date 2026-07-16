import { createPaymentClient, Money, PaymentReference } from "@tec/payment";
import { NextResponse } from "next/server";

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

export async function POST_initialize(req: Request) {
  const body = await req.json();
  const result = await client.payments.initialize({
    amount: Money({ amount: body.amount, currency: body.currency ?? "NGN" }),
    reference: PaymentReference(body.reference),
    customer: { kind: "new", email: body.email },
    callbackUrl: body.callbackUrl,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }
  return NextResponse.json(result.value);
}

export async function POST_webhook(req: Request) {
  const rawBody = Buffer.from(await req.arrayBuffer());
  const signature = req.headers.get("x-paystack-signature") ?? "";

  const result = await client.webhooks.receive({
    rawBody,
    signature,
    headers: Object.fromEntries(req.headers.entries()),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 401 });
  }

  return NextResponse.json({ received: true });
}
