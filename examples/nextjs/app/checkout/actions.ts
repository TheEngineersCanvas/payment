/// <reference types="node" />

"use server";

import { createPaymentClient, Money, PaymentReference } from "@tec/payment";

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

interface InitializeResult {
  authorizationUrl?: string;
  error?: string;
}

interface VerifyResult {
  status?: string;
  reference?: string;
  id?: string;
  error?: string;
}

export async function initializePayment(
  _prevState: InitializeResult | null,
  formData: FormData,
): Promise<InitializeResult> {
  const reference = String(formData.get("reference"));
  if (!reference) return { error: "Missing reference" };

  const result = await client.payments.initialize({
    amount: Money({
      amount: Number(formData.get("amount")),
      currency: String(formData.get("currency") ?? "NGN"),
    }),
    reference: PaymentReference(reference),
    customer: {
      kind: "new",
      email: String(formData.get("email")),
      name: String(formData.get("name") ?? ""),
    },
    callbackUrl: String(formData.get("callbackUrl") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
  });

  if (!result.ok) {
    return { error: result.error.message };
  }

  return { authorizationUrl: result.value.authorizationUrl };
}

export async function verifyPayment(
  reference: string,
): Promise<VerifyResult> {
  const result = await client.payments.verify(PaymentReference(reference));

  if (!result.ok) {
    return { error: result.error.message };
  }

  return {
    status: result.value.status.kind,
    reference: result.value.reference,
    id: result.value.id,
  };
}
