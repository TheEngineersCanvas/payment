# Project Memory: Important Context

**Last updated:** 2026-07-14

---

## Architecture Rules

1. **Stateless SDK.** The package owns no database, no connection pool, no mutable module-state. All state is the application's responsibility.
2. **Provider ignorance.** Application code never imports a provider package directly. All provider access goes through `@tec/payment`.
3. **Dependency inversion.** `domain/` imports nothing outside itself. `application/` only imports `domain/` and shared types. `infrastructure/` implements `application/ports/`.
4. **Result-over-throw.** Expected errors (provider rejection, network failure) return `Result<T, E>`. Only programmer errors (bad config, invariant broken) throw.
5. **Branded primitives.** `Money`, `PaymentReference`, `Provider`, `MinorUnits` are all branded types constructed through validating factories. Raw `number` and `string` cannot enter the system at domain boundaries.

## Business Rules

1. **Money is in minor units.** Always. `Money.amount` is kobo/cents/paisa. Major unit representations are purely a UI concern.
2. **Reference is app-owned.** The SDK never generates payment references. The application provides them. This makes idempotency controllable by the app.
3. **Webhook raw body is mandatory.** Signature verification requires the exact bytes received, not a re-serialized JSON. Applications must capture `req.rawBody`.

## Security Rules

1. **Secrets never logged.** Logger auto-redacts fields matching `secret|authorization|password|signature|api[_-]?key|card|pan|cvv`.
2. **HMAC is constant-time.** Webhook verification uses `crypto.timingSafeEqual`, never `===`.
3. **HTTPS only.** `HttpClient` rejects `http://` URLs at construction time.
4. **Error messages are safe to return to users.** `PaymentError` subclasses have a generic `message`; details live in `meta` and `cause`.

## API Conventions

1. **Dual type+value export.** Domain objects that are both a type and a factory function (e.g. `Money`, `PaymentReference`) are exported under the same name. TypeScript's type/value namespace merging handles this.
2. **Public API firewall.** Only `src/public-api/index.ts` is published. Everything else is internal and may change without notice.
3. **`.js` import extensions.** All imports use the `.js` extension for the source `.ts` file (NodeNext resolution). External consumers see only `dist/` — they never import internal paths.

## Coding Conventions

1. **Modifier order:** `override readonly` (not `readonly override`).
2. **No `const enum`.** Use `{ ... } as const` with derived types. `const enum` breaks with `isolatedModules`.
3. **No `verbatimModuleSyntax`.** The flag breaks dual type+value re-exports across barrel files. `tsup`/esbuild handles type stripping correctly.
4. **Error classes are flat files.** One class per file in `src/errors/`, except `ProviderError` subclasses which co-locate with their base.
5. **Tests live next to source.** `src/domain/money/money.test.ts` is next to `src/domain/money/money.ts`. Integration tests go in `tests/`.

## Important Assumptions

1. Node 18+ is the minimum runtime. `fetch`, `AbortController`, `crypto` are available globally.
2. `tsup` 8.x is the build tool. Changing to `unbuild` or `tsc` directly would require revisiting the exports config.
3. `vitest` 3.x is the test runner. Tests use `import { describe, it, expect } from "vitest"`, not globals.
4. Paystack is the only v1 provider. Other providers are v2+.
