/// <reference types="node" />

import { createPaymentClient } from "@tec/payment";
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
  console.log(`Payment ${event.payment.reference} succeeded — fulfill order`);
});

export async function POST(req: Request): Promise<NextResponse> {
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
