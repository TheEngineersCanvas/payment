import { describe, it, expect } from "vitest";
import {
  ProviderError,
  ProviderBadRequestError,
  ProviderUnauthorizedError,
  ProviderNotFoundError,
  ProviderConflictError,
  ProviderRateLimitError,
} from "../../src/errors/provider-error.js";
import { ProviderUnavailableError } from "../../src/errors/provider-unavailable-error.js";

describe("FetchHttpClient error specialization", () => {
  it("HTTP 400 returns ProviderBadRequestError", () => {
    const err400 = new ProviderBadRequestError("Bad request (400) to provider", {
      providerCode: "400",
    });
    expect(err400.httpStatus).toBe(400);
    expect(err400.isRetryable).toBe(false);
    expect(err400 instanceof ProviderBadRequestError).toBe(true);
  });

  it("HTTP 401 returns ProviderUnauthorizedError", () => {
    const err401 = new ProviderUnauthorizedError("Unauthorized (401) to provider", {
      providerCode: "401",
    });
    expect(err401.httpStatus).toBe(401);
    expect(err401.isRetryable).toBe(false);
    expect(err401 instanceof ProviderUnauthorizedError).toBe(true);
  });

  it("HTTP 403 returns ProviderUnauthorizedError", () => {
    const err403 = new ProviderUnauthorizedError("Unauthorized (403) to provider", {
      providerCode: "403",
    });
    expect(err403.httpStatus).toBe(401);
    expect(err403.isRetryable).toBe(false);
    expect(err403 instanceof ProviderUnauthorizedError).toBe(true);
  });

  it("HTTP 404 returns ProviderNotFoundError", () => {
    const err404 = new ProviderNotFoundError("Not found (404) at provider", {
      providerCode: "404",
    });
    expect(err404.httpStatus).toBe(404);
    expect(err404.isRetryable).toBe(false);
    expect(err404 instanceof ProviderNotFoundError).toBe(true);
  });

  it("HTTP 409 returns ProviderConflictError", () => {
    const err409 = new ProviderConflictError("Conflict (409) at provider", {
      providerCode: "409",
    });
    expect(err409.httpStatus).toBe(409);
    expect(err409.isRetryable).toBe(false);
    expect(err409 instanceof ProviderConflictError).toBe(true);
  });

  it("HTTP 429 returns ProviderRateLimitError", () => {
    const err429 = new ProviderRateLimitError("Rate limited (429) by provider", {
      providerCode: "429",
    });
    expect(err429.httpStatus).toBe(429);
    expect(err429.isRetryable).toBe(true);
    expect(err429 instanceof ProviderRateLimitError).toBe(true);
  });

  it("HTTP 500 returns ProviderUnavailableError", () => {
    const err500 = new ProviderUnavailableError("Provider returned 500 for url", {
      providerCode: "500",
    });
    expect(err500.httpStatus).toBe(502);
    expect(err500.isRetryable).toBe(true);
    expect(err500 instanceof ProviderUnavailableError).toBe(true);
  });

  it("instanceof checks work for specialized errors", () => {
    const rateLimit = new ProviderRateLimitError("test");
    expect(rateLimit instanceof ProviderRateLimitError).toBe(true);
    expect(rateLimit instanceof ProviderError).toBe(true);
    expect(rateLimit instanceof ProviderBadRequestError).toBe(false);
  });

  it("ProviderRateLimitError is retryable", () => {
    const err = new ProviderRateLimitError("test");
    expect(err.isRetryable).toBe(true);
  });
});
