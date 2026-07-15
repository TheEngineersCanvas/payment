import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookVerifier } from "../../application/ports/webhook-verifier.js";

export class HmacWebhookVerifier implements WebhookVerifier {
  private readonly secret: string;
  private readonly algorithm: string;

  constructor(secret: string, algorithm: "sha256" | "sha512" = "sha512") {
    this.secret = secret;
    this.algorithm = algorithm;
  }

  verify(rawBody: string | Buffer, signature: string): boolean {
    try {
      const bodyBuffer = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
      const expected = createHmac(this.algorithm, this.secret)
        .update(bodyBuffer)
        .digest("hex");

      const a = Buffer.from(expected);
      const b = Buffer.from(signature);

      if (a.length !== b.length) {
        return false;
      }

      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
