# Task 004 — Phase 4: Polish, Docs, Release

- **Title:** Phase 4: Polish, Docs, Release
- **Date:** 2026-07-16
- **Objective:** ESLint with boundary enforcement, code coverage, `RefundService.fetch()` un-stubbing, multi-provider webhook routing, build pipeline, examples, comprehensive documentation, v0.1.0 release prep.
- **Status:** Complete

## Summary

Phase 4 delivers a publishable v0.1.0 package. ESLint with `eslint-plugin-boundaries` enforces the hexagonal architecture at lint time. `RefundService.fetch()` now calls the real Paystack `GET /refund/:id` endpoint. `WebhookService.receive()` supports try-all multi-provider routing. Build pipeline includes `verify-build.sh`, `publish-checklist.sh`, and `.npmignore`. Three framework examples (Next.js, Hono, Express) and 7 new documentation files complete the package.

Tests grew from 63 to 73 (+10). 0 type errors. 0 lint errors.

## Files Changed

### New files (19)

**Config & Pipeline (4):**
- `eslint.config.js` — ESLint v10 flat config with @typescript-eslint rules and eslint-plugin-boundaries
- `.npmignore` — Defense-in-depth exclusions
- `CHANGELOG.md` — Keep a Changelog format
- `vitest.config.ts` — Updated with coverage thresholds

**Scripts (2):**
- `scripts/verify-build.sh` — Sequential pipeline: types → lint → test → build → verify
- `scripts/publish-checklist.sh` — Pre-publish manual checklist

**Use cases (2):**
- `src/application/use-cases/fetch-refund.ts` — Fetch a refund by ID via provider
- `src/application/use-cases/fetch-refund.test.ts` — 3 tests

**Service tests (1):**
- `src/application/services/webhook-service.test.ts` — 5 tests for multi-provider routing

**Examples (4):**
- `examples/nextjs/route.ts`
- `examples/hono/index.ts`
- `examples/express/index.ts`
- `examples/README.md`

**Docs (7):**
- `docs/extension-guide.md`
- `docs/provider-guide.md`
- `docs/migration-guide.md`
- `docs/versioning.md`
- `docs/performance.md`
- `docs/concurrency.md`
- `docs/api-stability.md`
- `docs/architecture.md`

### Modified files (8)

- `src/application/ports/payment-provider.ts` — Added optional `fetchRefund()` method
- `src/infrastructure/providers/paystack/paystack-adapter.ts` — Implemented `fetchRefund()` via `GET /refund/:id`
- `src/application/services/webhook-service.ts` — Multi-provider try-all routing with `ReadonlyMap<Provider, PaymentProvider>`
- `src/application/services/refund-service.ts` — `fetch()` now calls `fetchRefund` use case (was `InternalError` stub)
- `src/public-api/client.ts` — Passes provider map to WebhookService; removed unused `id` in health loop
- `src/public-api/client.ts` — Passes provider map to WebhookService
- `tests/contract/provider-contract.spec.ts` — 2 new fetchRefund contract tests
- `tsconfig.json` — Removed `tests` from exclude (lets project service discover test files)
- `package.json` — Added `test:coverage`, `verify`, `lint:fix` scripts; updated `prepublishOnly`; added `repository`, `keywords`, `author`
- `README.md` — Full rewrite with doc links, examples, development commands

### Lint-fix only (13 files)

Minor import consolidation and unused variable cleanup across event-subscription-view, payment-service, refund-service, parse-webhook, refund-payment, fetch-http-client, paystack-adapter, paystack-mapper, paystack-webhook, client, and test files.

## Design Decisions

1. **ESLint flat config (v10).** Uses modern `eslint.config.js` format with `projectService: true` for type-aware linting.
2. **Coverage exclusions.** Pure type definition files (events, ports, interfaces, DTOs) are excluded from coverage. Use cases tested via contract tests show 0% individually — this is a known gap.
3. **Boundaries v7 API.** Uses `boundaries/dependencies` with object-based selectors (`element: { types: "domain" }`).
4. **Webhook try-all routing.** When `provider` is not specified, the service iterates all configured providers and uses the first whose signature verifies. This eliminates the need for app-level header inspection.
5. **FetchRefund as optional port method.** Not all providers support fetching a single refund by ID. The port method is optional; the use case returns an error if unsupported.

## API Changes

- `RefundService.fetch(id)` now returns `Promise<Result<Refund, PaymentError>>` (was `unknown`)
- `WebhookService` now accepts a `ReadonlyMap<Provider, PaymentProvider>` instead of a single provider
- New optional `fetchRefund(id)` method on `PaymentProvider` port

## Testing Guide

```bash
bun run test              # 73 tests (79 with sandbox)
bun run test:coverage     # 65%+ thresholds
bun run lint              # 0 errors, 0 warnings
bash scripts/verify-build.sh  # Full pipeline
```

## Risks

1. Coverage thresholds at 65% are conservative. Increasing thresholds requires unit tests for 4 use cases (fetch, initialize, list, verify) that are currently only tested via contract/integration tests.
2. `HmacWebhookVerifier` hardcodes SHA-512. When adding a SHA-256 provider (Stripe), the verifier must accept a configurable algorithm.

## Future Improvements

- Add unit tests for initialize, verify, fetch, list use cases to improve coverage
- Make HMAC algorithm configurable per provider (prepare for non-Paystack providers)
- Add `RefundService.list()` (provider-dependent, not universally available)
- Add npm publish pipeline with provenance

## Related Tasks

- Phase 1 (skeleton — complete)
- Phase 2 (Paystack end-to-end — complete)
- Phase 3 (webhooks, refunds, hardening — complete)

## Suggested Git Commit

```
feat(phase-4): polish, docs, release prep

- ESLint with @typescript-eslint rules and eslint-plugin-boundaries
  enforcing hexagonal layer dependencies
- Code coverage with @vitest/coverage-v8 (65%+ thresholds)
- RefundService.fetch() now calls real Paystack GET /refund/:id
  (was InternalError stub); new fetch-refund use case + adapter method
- Multi-provider webhook routing: try-all across configured providers,
  explicit provider override supported
- Build pipeline: verify-build.sh, publish-checklist.sh, .npmignore
- Examples: Next.js (App Router), Hono, Express
- Docs: extension-guide, provider-guide, migration-guide, versioning,
  performance, concurrency, api-stability, architecture;
  updated public-api.md with full reference
- Tests: +10 (73 total, 0 type errors, 0 lint errors)
- package.json: added repository, keywords, author, verify script
```
