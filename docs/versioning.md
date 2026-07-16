# Versioning

`@tec/payment` follows [Semantic Versioning 2.0.0](https://semver.org/).

## Version Format

`MAJOR.MINOR.PATCH` (e.g., `1.2.3`)

- **MAJOR:** Backward-incompatible API changes
- **MINOR:** New backward-compatible features
- **PATCH:** Backward-compatible bug fixes

## What Constitutes a Breaking Change

- Any change to the public API surface (`src/public-api/index.ts` exports):
  - Removing a type or value export
  - Changing a function signature (parameter type, return type)
  - Changing an interface member's type
  - Changing a branded type's construction (validation becoming stricter)
- Changing the behavior of a `throw` boundary (e.g., making a previously-thrown error into a `Result`)
- Dropping support for a Node.js major version
- Adding a required field to `PaymentClientConfig`
- Changing `Result<T, E>` shape (the `ok`/`value`/`error` discriminant)

## What Does NOT Constitute a Breaking Change

- Adding new optional fields to existing config types
- Adding new methods to service facades (e.g., new `payments.*` method)
- Adding new error subclasses (consumers match on `instanceof PaymentError`)
- Adding new `Provider` literal variants
- Adding new domain event types (subscriptions are opt-in per event)
- Changes to the internal API (`application/`, `domain/`, `infrastructure/`)
- Bug fixes that make validation stricter where the old behavior was clearly wrong
- Documentation improvements
- New provider support

## Stability Tiers

### Stable

Public API exports that carry backward-compatibility guarantees across minor and patch versions:

- `createPaymentClient(config)` factory
- `PaymentClient` interface
- `PaymentService`, `RefundService`, `WebhookService` method signatures
- All error classes (`PaymentError`, `ValidationError`, etc.)
- `Result<T, E>` type and `ok`/`err` constructors
- Branded type constructors (`Money`, `PaymentReference`, `Provider`, `Currency`)

### Evolving

Service methods may gain new optional parameters in minor versions. Existing required parameters will not change.

### Internal

Everything not in `src/public-api/index.ts` is **internal**. No stability guarantees:

- Use case functions (`initializePayment`, `refundPayment`, etc.)
- Adapter implementations (`PaystackAdapter`)
- Mapper functions (`mapPaystackRefundResponse`)
- Infrastructure classes (`FetchHttpClient`, `ConsoleLogger`)
- Domain entities and value objects
- Provider contract interface (`PaymentProvider`)

If your application imports from paths beginning with `../../domain/`, `../../infrastructure/`, or `../../application/`, you are depending on internal API — expect breakage on any version bump.

## Deprecation Policy

**v1.x:** No deprecations. All APIs added in v1.0 remain supported through v1.x.

**v2.x:** Deprecation will follow Rails-style: deprecated in v2.x, removed in v3.0. Deprecated APIs will emit `console.warn` at runtime and carry `@deprecated` JSDoc annotations.

## v2 Preview

Planned for v2 (no timeline):

- Provider packages split to `@tec/payment-paystack`, `@tec/payment-stripe`
- Pluggable retry with backoff strategies
- Circuit breaker and rate limiter
- Subscription/recurring payment support
- Outbox event bus for transactional event persistence
- Parallel event handler execution
