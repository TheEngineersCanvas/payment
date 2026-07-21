# Task: NestJS Adapter

**Date:** 2026-07-21

## Objective

Add a `@TheEngineersCanvas/payment/nestjs` subpath export providing idiomatic NestJS DI/module
support for the framework-agnostic payment SDK.

## Summary

Created `src/adapters/nestjs/` with a dynamic `PaymentModule` (`forRoot` /
`forRootAsync`), an injectable `PaymentService` wrapping the SDK client, a
`WebhookController` with opt-out, a `NestLoggerAdapter` bridging to Nest's
structured logger, and a typed `RawBodyRequest` interface.  Added 18 unit
tests covering DI resolution, positive/negative webhook paths, subclass
override, and the logger adapter.  Subpath exports ESM + CJS + `.d.ts`.

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `src/adapters/nestjs/constants.ts` | `TEC_PAYMENT_CLIENT` injection token, `DEFAULT_WEBHOOK_PATH` |
| `src/adapters/nestjs/payment.module.ts` | `PaymentModule.forRoot()` / `forRootAsync()` dynamic module |
| `src/adapters/nestjs/payment.service.ts` | `@Injectable()` wrapper delegating `payments`, `refunds`, `webhooks`, `events`, `health` |
| `src/adapters/nestjs/webhook.controller.ts` | `@Controller(DEFAULT_WEBHOOK_PATH)` with `@Post()` handler |
| `src/adapters/nestjs/nest-logger.adapter.ts` | Bridges NestJS `Logger` to the SDK `Logger` interface |
| `src/adapters/nestjs/raw-body-request.ts` | Typed request interface for `rawBody: true` consumers |
| `src/adapters/nestjs/index.ts` | Barrel export |
| `src/adapters/nestjs/payment.module.test.ts` | 18 unit tests |
| `examples/nestjs/main.ts` | Bootstrap with `rawBody: true` |
| `examples/nestjs/app.module.ts` | `PaymentModule.forRoot()` wired into `AppModule` |

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Added `./nestjs` subpath export, optional peerDependencies, devDependencies |
| `tsup.config.ts` | Second entry point `adapters/nestjs/index` |
| `eslint.config.js` | Added `adapters` boundary element + import policy |
| `tsconfig.json` | Added `experimentalDecorators` / `emitDecoratorMetadata` |
| `README.md` | NestJS section with `forRoot`, `forRootAsync`, raw-body setup, subclass override |
| `examples/README.md` | NestJS row in framework table |
| `docs/memory/current-state.md` | Updated |

## Design Decisions

1. **Factory providers** — Service and controller classes are instantiated via
   `useFactory` rather than Nest's decorator-based DI.  This keeps the adapter
   compatible with esbuild/vitest, which do not emit `design:paramtypes`
   metadata.  A comment in the module explains this trade-off.

2. **`constants.ts` extraction** — `TEC_PAYMENT_CLIENT` and `DEFAULT_WEBHOOK_PATH`
   live in a separate file, breaking the circular dependency between
   `payment.module.ts` and `webhook.controller.ts`.

3. **`global: false`** — The `DynamicModule` does not set `global: true`.
   Consumers who want global injection wrap `PaymentModule.forRoot()` in a
   custom `@Global()` module.  This keeps the dependency graph explicit for
   payment-touching modules.

4. **`registerWebhookController` opt-out** — Defaults `true`.  Consumers
   route-by-subclass by setting `false` and registering their own
   `WebhookController` subclass with a different `@Controller()` prefix.

5. **`Result<T,E>` passthrough** — The service returns `Result` objects as-is.
   No thrown exceptions — consumers match or unwrap as they prefer.

6. **`NestLoggerAdapter`** — Bridges Nest's structured `Logger` into the SDK's
   `Logger` interface, enabling SDK logs to flow through Nest's logging
   pipeline.

## API Changes

- **New subpath:** `@TheEngineersCanvas/payment/nestjs` imports:
  `PaymentModule`, `PaymentService`, `WebhookController`,
  `NestLoggerAdapter`, `TEC_PAYMENT_CLIENT`, `DEFAULT_WEBHOOK_PATH`,
  `RawBodyRequest` (type), `PaymentModuleOptions` (type),
  `PaymentModuleAsyncOptions` (type)

- **No changes** to `@TheEngineersCanvas/payment` main entry.  Zero new runtime dependencies.

## Security Review

- Webhook signature verification delegated to core SDK (`WebhookService.receive()`) which uses HMAC-512 with `crypto.timingSafeEqual`.
- Controller returns 401 on verification failure (correct auth error, not 403).
- `rawBody: undefined` (forgotten `rawBody: true`) returns 401 rather than crashing.
- No secrets exposed in logs — error messages do not include raw bodies or signatures.

## Testing Guide

```bash
bun run test src/adapters/nestjs/payment.module.test.ts
```

| Test group | Coverage |
|-----------|----------|
| `forRoot` structure | DynamicModule shape, default controller registration |
| `forRoot` DI | Resolves `TEC_PAYMENT_CLIENT`, `PaymentService`, `WebhookController` |
| `forRoot` controller opt-out | `registerWebhookController: false` / `true` |
| `forRootAsync` structure | Same as forRoot |
| `forRootAsync` DI | Resolves client; `inject` forwarding from external module |
| Webhook positive | Valid HMAC-signed payload → `{ received: true }` |
| Webhook negative | Bad signature → 401, missing signature → 401, missing rawBody → 401 |
| Subclass DI | Explicit `@Inject(TEC_PAYMENT_CLIENT)` + `super(client)`, resolved via `Test.createTestingModule()` |
| Logger adapter | Implements SDK `Logger` interface, `child()` returns valid adapter |

## Risks

- **`rawBody: true` must be set in `NestFactory.create()`** — if forgotten, all webhooks fail with 401.  Documented prominently in README, controller JSDoc, and example.
- **Factory providers are non-idiomatic** — uses `useFactory` instead of class providers.  Rationale documented in module comment.  Future refactoring to class providers requires `emitDecoratorMetadata` support in the build pipeline.

## Future Improvements

- Add `@Global()` convenience wrapper module for teams that want global injection
- Support non-Express adapters (Fastify) by making `RawBodyRequest` generic
- Export a `TEC_PAYMENT_MODULE_OPTIONS` token for module-level configuration
- Route-level raw body middleware instead of global `rawBody: true`

## Suggested Git Commit

```
feat(nestjs): add NestJS adapter with docs, logger bridge, typed request, and test coverage
```
