import { Controller, Inject, Post, Req, Res } from "@nestjs/common";
import type { PaymentClient } from "../../public-api/index.js";
import { TEC_PAYMENT_CLIENT, DEFAULT_WEBHOOK_PATH } from "./constants.js";

@Controller(DEFAULT_WEBHOOK_PATH)
export class WebhookController {
  constructor(
    @Inject(TEC_PAYMENT_CLIENT) private readonly client: PaymentClient,
  ) {}

  @Post()
  async handle(@Req() req: unknown, @Res() res: unknown): Promise<void> {
    const typedReq = req as {
      rawBody?: string | Buffer;
      headers?: Record<string, string | readonly string[] | undefined>;
    };
    const typedRes = res as {
      status: (code: number) => { json: (body: unknown) => void };
      json: (body: unknown) => void;
    };

    const signature =
      (typedReq.headers?.["x-paystack-signature"] as string | undefined) ?? "";

    const rawBody = typedReq.rawBody ?? "";

    const result = await this.client.webhooks.receive({
      rawBody,
      signature,
      headers: typedReq.headers,
    });

    if (!result.ok) {
      typedRes.status(401).json({ error: result.error.message });
      return;
    }

    typedRes.json({ received: true });
  }
}
