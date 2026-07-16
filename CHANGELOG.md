# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — Unreleased

### Added

- Initial release with Paystack provider support
- `createPaymentClient()` factory and `fromEnv()` convenience
- Payment lifecycle: initialize, verify, fetch, list
- Webhook reception with HMAC-SHA512 signature verification and multi-provider try-all routing
- Full and partial refunds with `create()` and `fetch()`
- Domain event system (9 event types) with in-process pub/sub
- 14 error classes with typed `Result<T, E>` discriminated unions
- Branded primitives: `Money`, `PaymentReference`, `Provider`, `Currency`, `Metadata`
- Framework-agnostic: tested with Next.js, Hono, Express snippets
- Zero runtime dependencies
- Node 18+ and Bun support
- ESLint with architectural boundary enforcement
- Code coverage reporting with vitest
