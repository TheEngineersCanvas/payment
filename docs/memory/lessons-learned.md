# Project Memory: Lessons Learned

**Last updated:** 2026-07-14

---

## LL-001: `verbatimModuleSyntax` breaks dual type+value re-exports

**Problem:** `export type { Money }` and `export { Money }` from the same source caused duplicate identifier errors. Discovered this after the initial barrel was written.

**Root Cause:** `verbatimModuleSyntax` changes how TypeScript resolves re-exports. When a module re-exports both the type and value form of the same name through an intermediate barrel (index.ts → types.ts → money.ts), TypeScript can't disambiguate and reports duplicates.

**Resolution:** Removed `verbatimModuleSyntax` from `tsconfig.json`. Our build tool (`tsup`) uses esbuild which strips types correctly regardless. The flag's safety was redundant.

**Prevention:** If another project needs `verbatimModuleSyntax`, avoid intermediate barrel files for dual type+value exports. Export directly from the source, or use different names for the type and value (e.g., `export { Money as createMoney }` for the factory).

---

## LL-002: `const enum` incompatible with `isolatedModules`

**Problem:** Initially wrote `const enum ErrorCode { ... }` which causes `tsc` errors with `isolatedModules: true`.

**Root Cause:** `const enum` values are inlined at compile time. When exported from a module, other modules can't reference them because `isolatedModules` treats each file independently.

**Resolution:** Replaced with:
```ts
export const ErrorCode = { CONFIGURATION: "CONFIGURATION", ... } as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
```

**Prevention:** Never use `const enum` in exported positions. Use `as const` objects with derived types instead.

---

## LL-003: Modifier order in TypeScript: `override readonly`, not `readonly override`

**Problem:** Writing `readonly override code` caused TS1029 errors in all 12 error subclass files.

**Root Cause:** TypeScript's grammar requires modifiers in a specific order: accessibility (public/private/protected) → `static` → `override` → `readonly` → `abstract`. `override` precedes `readonly`.

**Resolution:** Fixed with `sed` (find-and-replace across all error files).

**Prevention:** Use an ESLint rule to enforce modifier ordering (`@typescript-eslint/member-ordering` or similar). Add to lint config in Phase 4.

---

## LL-004: `noImplicitOverride` requires `override` on abstract property implementations

**Problem:** Expected that abstract properties don't need `override` (they're implementations, not overrides). TypeScript with `noImplicitOverride: true` disagrees.

**Root Cause:** TypeScript treats abstract property declarations as "overridable members" in the base class. Implementations in concrete subclasses must use `override`. This is by design — the flag exists to prevent accidental overrides of non-abstract members, but it also catches abstract implementations.

**Resolution:** Added `override` to all subclass property declarations.

**Prevention:** When using `noImplicitOverride: true`, always use `override` on any property that shadows one from a parent class, whether abstract or concrete.

---

## LL-005: Public API barrel must mirror docs/public-api.md; both must be guarded by a contract test

**Problem:** The `public-api/index.ts` barrel was missing 20+ types that were documented in `docs/public-api.md` and used in the README examples. TypeScript consumers importing `Payment`, `HealthStatus`, `PaymentStatus`, etc. from `@TheEngineersCanvas/payment` got `Module has no exported member`. This was only caught after a detailed manual code review of every type used in the docs vs. every `export` line in the barrel.

**Root Cause:** The barrel was hand-maintained without an automated check. As new types were added to the codebase and documented, nobody validated that the barrel kept pace. The build (`tsup`) and type checker (`tsc --noEmit`) both pass even when the barrel is incomplete because internal imports work fine — the bug only surfaces when an external consumer tries to import from `@TheEngineersCanvas/payment`.

**Resolution:** 
1. Exported all missing types from the public barrel.
2. Added `tests/contract/public-api.spec.ts` — enumerates every type referenced in `docs/public-api.md` and asserts it can be imported from `src/public-api/index.js`. If a type is added to the docs but not the barrel, the test fails at CI time.

**Prevention:** Any change to `docs/public-api.md` that adds a new type name MUST be accompanied by a matching `export` in `src/public-api/index.ts` AND a corresponding assertion in `tests/contract/public-api.spec.ts`. The test is the single source of truth for the public surface.
