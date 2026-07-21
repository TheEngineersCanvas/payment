# Task 001 — Phase 1: Skeleton & Invariants

- **Title:** Phase 1: Skeleton & Invariants
- **Date:** 2026-07-14
- **Objective:** Establish the folder structure, type system, error hierarchy, config tooling, and public API barrel for `@TheEngineersCanvas/payment`. Zero logic, types only.
- **Status:** Complete

## Summary

Created 22 source files, 2 test files, and 3 config files. The package compiles cleanly (`tsc --noEmit` = 0 errors), builds with `tsup` (ESM + CJS + .d.ts), and 8 vitest tests pass. Import is verified side-effect-free.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Updated | Renamed to `@TheEngineersCanvas/payment`, added vitest/tsup/@types/node devDeps, exports field |
| `tsconfig.json` | Replaced | ES2022 target, NodeNext module, strict, `isolatedModules` (no `verbatimModuleSyntax`) |
| `tsup.config.ts` | Created | ESM + CJS + d.ts, entry `src/public-api/index.ts` |
| `vitest.config.ts` | Created | Includes `src/**/*.test.ts` and `tests/**/*.spec.ts` |
| `src/public-api/index.ts` | Created | Public barrel — types + values |
| `src/public-api/version.ts` | Created | `VERSION = "0.1.0"` |
| `src/domain/money/currency.ts` | Created | `Currency` branded union |
| `src/domain/money/money.ts` | Created | `Money` interface, `MinorUnits` branded integer, factories |
| `src/domain/money/money.test.ts` | Created | 4 tests for MinorUnits + Money construction |
| `src/domain/reference/payment-reference.ts` | Created | `PaymentReference` branded string + factory |
| `src/domain/provider/provider.ts` | Created | `Provider` branded union + factory |
| `src/domain/metadata/metadata.ts` | Created | `Metadata` type |
| `src/shared/result/result.ts` | Created | `Result<T,E>`, `ok()`, `err()`, `attempt()` |
| `src/shared/result/result.test.ts` | Created | 4 tests for Result utilities |
| `src/errors/error-codes.ts` | Created | `ErrorCode` + `ErrorCategory` const objects + derived types |
| `src/errors/payment-error.ts` | Created | Abstract `PaymentError` base (extends Error) |
| `src/errors/configuration-error.ts` | Created | |
| `src/errors/validation-error.ts` | Created | |
| `src/errors/provider-error.ts` | Created | `ProviderError` + 5 subclasses |
| `src/errors/provider-unavailable-error.ts` | Created | |
| `src/errors/network-error.ts` | Created | |
| `src/errors/timeout-error.ts` | Created | |
| `src/errors/webhook-validation-error.ts` | Created | |
| `src/errors/verification-error.ts` | Created | |
| `src/errors/refund-error.ts` | Created | |
| `src/errors/internal-error.ts` | Created | |
| `index.ts` (root) | Deleted | Placeholder Bun file; replaced by `src/public-api/index.ts` |

## Design Decisions

1. **`verbatimModuleSyntax` removed from tsconfig.** The flag breaks dual type+value re-exports (same name for interface + factory) when chained through intermediate barrels. Since `tsup` strips types correctly via esbuild, the flag adds no protection and causes friction.
2. **`isolatedModules: true` kept.** This catches accidental `const enum` usage and type-namespace merging, both of which break bundler-based builds.
3. **`const` objects + derived types instead of `const enum`.** TypeScript `const enum` conflicts with `isolatedModules` when exported. Using `{ ... } as const` with `type X = (typeof X)[keyof typeof X]` achieves the same goal.
4. **`override readonly` (not `readonly override`).** TypeScript enforces modifier order: `override` before `readonly`. This is per TS spec for property modifiers.
5. **Dual type+value exports for `Money`, `PaymentReference`, `Provider`.** Each exports both an interface/type AND a factory function under the same name. This gives consumers a clean API: `Money({ amount: 50000, currency: 'NGN' })` works as both construction and type annotation.
6. **`ProviderError.code` typed as `ErrorCode` not a literal.** This lets subclasses (e.g., `ProviderBadRequestError`) narrow the code to a specific value. If typed as the literal `"PROVIDER"`, narrowing fails at compile time.

## API Changes

None (initial version). The public surface is:

**Types:** `Currency`, `Money`, `MinorUnits`, `PaymentReference`, `Provider`, `Metadata`, `Result`, `PaymentErrorOptions`
**Values:** `Money` (factory), `MinorUnits` (factory), `PaymentReference` (factory), `Provider` (factory), `ok`, `err`, `attempt`, `VERSION`
**Errors:** `PaymentError` (base), `ConfigurationError`, `ValidationError`, `ProviderError`, `ProviderBadRequestError`, `ProviderUnauthorizedError`, `ProviderNotFoundError`, `ProviderConflictError`, `ProviderRateLimitError`, `ProviderUnavailableError`, `NetworkError`, `TimeoutError`, `WebhookValidationError`, `VerificationError`, `RefundError`, `InternalError`
**Constants:** `ErrorCode`, `ErrorCategory`

## Database Changes

None. The SDK is stateless.

## Security Review

- No secrets handled in this phase (types only, factories validate but don't persist).
- `PaymentError` base uses `ErrorOptions.cause` for error chaining — no sensitive data exposed in constructors.
- Factory functions (`MinorUnits`, `PaymentReference`, `Provider`) throw `ValidationError` on invalid input — fail-fast, no coercion.
- No network, file I/O, or crypto operations.

## Testing Guide

```bash
bun run check-types   # tsc --noEmit (0 errors)
bun run test          # vitest run (8 tests, 2 suites)
bun run build         # tsup (ESM + CJS + d.ts)
```

**Manual smoke test:**
```bash
node -e "const m = require('./dist/index.cjs'); console.log('VERSION:', m.VERSION); console.log('Money factory:', typeof m.Money); console.log('ErrorCode count:', Object.keys(m.ErrorCode).length);"
```

## Risks

- Low. Phase 1 is pure types — no subtle behavior.
- The `Currency` branded union uses `(string & {})` to prevent union collapse; this TypeScript idiom may behave differently across versions. Mitigation: pinned to TS >= 5.0.
- Dual type+value naming may confuse consumers unfamiliar with TypeScript's type/value namespace merging. Mitigation: this is a standard pattern (Stripe SDK, Zod, ArkType all use it).

## Future Improvements

- Add `@deprecated` JSDoc to the `index.ts` placeholder (already deleted).
- Consider renaming factory functions to `createMoney`, `createPaymentReference` etc. if dual-naming causes confusion in practice.

## Related Tasks

- ADR-0001 (architecture blueprint)
- Phase 2 (Paystack end-to-end)

## Suggested Git Commit

```
feat: add skeleton, types, error hierarchy, and public API barrel

- Domain types: Money, MinorUnits, Currency, PaymentReference, Provider, Metadata
- Error hierarchy: 15 error classes extending PaymentError
- Shared: Result<T,E> discriminated union with ok/err/attempt
- Toolchain: tsup (ESM+CJS+dts), vitest, strict tsconfig
- 8 passing tests, zero type errors
```
