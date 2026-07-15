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

  it("accepts a Buffer body producing same result as string", () => {
    const body = JSON.stringify({ event: "charge.success", data: { id: 1 } });
    const buffer = Buffer.from(body, "utf8");
    const signature = createHmac("sha512", SECRET).update(buffer).digest("hex");

    expect(verifier.verify(buffer, signature)).toBe(true);
  });

  it("rejects a Buffer with wrong encoding", () => {
    const body = JSON.stringify({ event: "charge.success", data: { id: 1 } });
    const wrongBody = Buffer.from(JSON.stringify({ event: "charge.failed" }), "utf8");
    const signature = createHmac("sha512", SECRET).update(body).digest("hex");

    expect(verifier.verify(wrongBody, signature)).toBe(false);
  });
});
