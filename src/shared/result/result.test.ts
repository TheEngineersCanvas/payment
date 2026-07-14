import { describe, it, expect } from "vitest";
import { ok, err, attempt } from "./result.js";

describe("ok", () => {
  it("creates a success result", () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe(42);
    }
  });
});

describe("err", () => {
  it("creates an error result", () => {
    const r = err("something went wrong");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("something went wrong");
    }
  });
});

describe("attempt", () => {
  it("wraps a successful promise", async () => {
    const r = await attempt(() => Promise.resolve(42));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it("catches thrown errors", async () => {
    const r = await attempt(() => Promise.reject(new Error("fail")));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.message).toBe("fail");
    }
  });
});
