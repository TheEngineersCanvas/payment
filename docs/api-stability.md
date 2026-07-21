# API Stability

Public API stability guarantees and migration timeline for `@TheEngineersCanvas/payment`.

## Public API Surface

The **only** stable surface is `src/public-api/index.ts`. Every export from this file is covered by the stability guarantees below:

```ts
export { createPaymentClient, VERSION };
export type { PaymentClient, PaymentClientConfig };
export type { Logger, EventBus, EventSubscription };
export type { Payment, PaymentStatus, PaymentRequest, Customer };
export type { Refund, RefundStatus, RefundStatusKind };
export type { WebhookEvent };
export type { Result };
export { ok, err, attempt };
export { Money, MinorUnits, Currency, PaymentReference, Provider, Metadata };
export { RefundReason };
export { PaymentError, ConfigurationError, ValidationError, ... };
```

## Stability Tiers

### Stable (`v1.x`)

Breaking changes require a MAJOR version bump:

- `createPaymentClient()` signature
- `PaymentClient` interface (all service properties and their public methods)
- `PaymentService.initialize()`, `.verify()`, `.fetch()`, `.list()`
- `RefundService.create()`, `.fetch()`
- `WebhookService.receive()`
- All error classes in `errors/`
- `Result<T, E>` shape and constructors
- All branded type factories (`Money`, `PaymentReference`, `Provider`, `Currency`, `Metadata`, `RefundReason`)

These APIs will **not** change in a way that breaks existing consumers across `v1.0.0` → `v1.x.x`.

### Evolving (`v1.x`)

New methods or optional parameters may be added in minor versions without breaking existing callers:

- New methods on service facades (e.g., `payments.fetchByReference()`)
- New optional fields on `PaymentClientConfig`
- New optional fields on input types (`PaymentRequest`, `RefundCreateInput`, `WebhookInput`)

Required parameters on existing methods will **not** change in minor versions.

### Experimental

**None in v1.0.** If a feature is added as experimental in a future minor, it will be gated behind a `features` flag in config and documented as unstable.

### Internal

Everything **not** in `src/public-api/index.ts` is internal. This includes:

- `src/application/` — use cases, ports, services (except those re-exported)
- `src/domain/` — entities, value objects (except branded types)
- `src/infrastructure/` — adapters, HTTP client, event bus, loggers
- `src/shared/` — utilities, brand type
- `src/errors/` — error implementations

Internal APIs may change in any version (major, minor, or patch) without notice.

**Do not import from paths beginning with `../../domain/`, `../../infrastructure/`, or `../../application/`.**

## Backward Compatibility Policy

`v1.x → v1.y` is **non-breaking**. Code compiled against `v1.0.0` will compile and run against `v1.1.0` without changes.

`v1.x → v2.0` **may break** if the public API surface changes. Breaking changes will be documented in the changelog.

## Provider Adapter Stability

Provider adapters (`Paystack`) are internal. Adding a new provider in a minor version is **not** a breaking change — unless it requires adding a required field to `PaymentClientConfig`.

## TypeScript Version Support

The SDK targets TypeScript 5.x. Minimum supported version: TypeScript 5.0+.

Dropping support for a TypeScript major version is a **minor** bump (it does not affect runtime behavior and consumers can pin their TS version).

## Node.js Version Support

- **Current minimum:** Node 18
- **Planned EOL:** Node 18 EOL (April 2025)
- **Next minimum bump:** Node 20 (will be a MAJOR if it drops Node 18 before its official EOL)
- **Bun:** Supported as a runtime, not tested in CI

## Runtime Dependencies

The `dependencies` field in `package.json` will **always** be empty in v1.x. Adding a runtime dependency is a MAJOR version bump.

## v2 Migration Preview

v2 will make these breaking changes (no timeline):

1. **Provider packages split.** `@TheEngineersCanvas/payment-paystack` as a separate installable package. Core becomes a shell with `ProviderFactory` registration.
2. **Pluggable retry.** `FetchHttpClient` gains configurable backoff strategies.
3. **Middleware pipeline.** Interceptor pattern for request/response hooks.
4. **Subscription support.** New `SubscriptionsService` with recurring payment methods.
