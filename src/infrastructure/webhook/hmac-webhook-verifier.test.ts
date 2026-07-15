import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { HmacWebhookVerifier } from "../../infrastructure/webhook/hmac-webhook-verifier.js";

const SECRET = "test-secret-12345";

describe("HmacWebhookVerifier", () => {
  const verifier = new HmacWebhookVerifier(SECRET, "sha512");

  it("verifies a valid signature", () => {
    const body = JSON.stringify({ event: "charge.success", data: { id: 1 } });
    const signature = createHmac("sha512", SECRET).update(body).digest("hex");

    expect(verifier.verify(body, signature)).toBe(true);
  });

  it("rejects an invalid signature", () => {
    const body = JSON.stringify({ event: "charge.success", data: { id: 1 } });
    const signature = "badsignaturestring";

    expect(verifier.verify(body, signature)).toBe(false);
  });

  it("rejects a signature for a different body", () => {
    const realBody = JSON.stringify({ event: "charge.success" });
    const signature = createHmac("sha512", SECRET).update(realBody).digest("hex");

    const wrongBody = JSON.stringify({ event: "charge.failed" });
    expect(verifier.verify(wrongBody, signature)).toBe(false);
  });
});
