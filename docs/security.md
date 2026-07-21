# Security

## Threat Model

`@TheEngineersCanvas/payment` is a payment SDK. It handles API secrets, signs/verifies webhooks, and makes outbound HTTPS calls to payment providers. This document enumerates what the SDK defends against and what it explicitly leaves to the application.

## Secret Management

**What the SDK does:**
- Secrets are read from configuration at `createPaymentClient()` construction time. They are not accepted as method arguments.
- The `Logger` port auto-redacts keys matching `secret|authorization|password|signature|api[_-]?key|card|pan|cvv` (case-insensitive).
- Error messages from the SDK never echo raw secrets. The `ProviderError` carries only the provider's own error code, not its full response body.

**What the application must do:**
- Read secrets from `process.env` or a secret manager. Never hardcode them.
- Rotate keys per your provider's guidance. Rebuild the client when a key changes.

## Webhook Verification

### Raw Body Contract

**The `rawBody` passed to `client.webhooks.receive()` MUST be the exact bytes the provider POSTed.** Re-serializing parsed JSON will produce a different byte sequence and cause signature verification to fail.

The SDK accepts both `string` and `Buffer` for `rawBody`. When a `Buffer` is passed, the bytes are HMAC'd directly — no UTF-8 re-encoding occurs. This is the recommended path:

```ts
// Next.js (App Router)
export async function POST(req: Request) {
  const rawBody = Buffer.from(await req.arrayBuffer());
  const signature = req.headers.get("x-paystack-signature") ?? "";

  const result = await client.webhooks.receive({
    rawBody,
    signature,
    headers: Object.fromEntries(req.headers.entries()),
  });

  if (!result.ok) {
    return Response.json({ error: result.error.message }, { status: 401 });
  }

  // Process result.value (WebhookEvent)
  return Response.json({ received: true });
}
```

```ts
// Hono
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
```

```ts
// Express (requires raw body middleware or custom parser)
app.post("/webhooks/tec", express.raw({ type: "application/json" }), (req, res) => {
  const result = await client.webhooks.receive({
    rawBody: req.body, // Buffer from express.raw()
    signature: req.headers["x-paystack-signature"] as string,
    headers: req.headers as Record<string, string>,
  });

  if (!result.ok) {
    return res.status(401).json({ error: result.error.message });
  }

  res.json({ received: true });
});
```

### Timing-Safe Comparison

HMAC comparison uses `crypto.timingSafeEqual`, never `===`. This prevents timing attacks that could leak the correct signature byte-by-byte.

### Replay Defense

The parsed `WebhookEvent.id` is exposed as `eventId` on the emitted `webhook.received` event. Applications must persist received `eventId` values and reject duplicates. The SDK does not maintain a deduplication store — this is the application's responsibility.

## Transport Security

- All provider HTTP traffic uses HTTPS. The `HttpClient` rejects `http://` URLs at the boundary.
- Certificate validation is delegated to the runtime (Node 18+/Bun).

## Sensitive Data in Errors

- All `PaymentError` subclasses are safe to return to end users. The `message` property contains a generic error string. Detailed diagnostics live in `meta` and `cause`.
- `InternalError` returns only a `correlationId`. The original error is logged but not exposed in the response.
- `rawResponse` inside `PaymentAttempt` carries the provider's full response for debugging. Applications must not serialize this to end users. It is flagged as internal in the type JSDoc.

## Dependency Hygiene

- v1 has **zero runtime dependencies**. Only Node built-ins: `crypto`, `fetch`, `URL`, `AbortController`, `TextDecoder`.
- Dev dependencies (`typescript`, `vitest`, `tsup`) are pinned. `npm audit` / `bun audit` is part of the release checklist.
- Engines: `node >= 18`.

## What the SDK Does NOT Defend Against

| Threat | Why out of scope | Mitigation owner |
|--------|------------------|------------------|
| Compromised app server | SDK cannot defend a host already lost | App / infra |
| Provider-side breach | Out of our control | Monitor `webhook.received` vs `payment.succeeded` |
| SSRF via webhook URL config | App does not configure webhook URLs in v1 | n/a |
| Replay across processes | SDK is single-process | App persists `WebhookEvent.id` |
| Phishing of customer | Not a system threat | UX / education |
