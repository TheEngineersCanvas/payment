import { describe, it, expect, vi } from "vitest";
import { ConsoleLogger } from "../../infrastructure/logging/console-logger.js";

describe("ConsoleLogger", () => {
  it("redacts sensitive keys", () => {
    const logger = new ConsoleLogger();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.info("test", {
      secretKey: "sk_live_abc123",
      authorization: "Bearer token",
      username: "john",
    });

    const call = spy.mock.calls[0]?.[0] as string | undefined;
    expect(call).toBeDefined();

    const parsed = JSON.parse(call!);
    expect(parsed.secretKey).toBe("[REDACTED]");
    expect(parsed.authorization).toBe("[REDACTED]");
    expect(parsed.username).toBe("john");

    spy.mockRestore();
  });

  it("redacts api_key and api-key variants", () => {
    const logger = new ConsoleLogger();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.info("test", { api_key: "secret", "api-key": "secret" });

    const call = spy.mock.calls[0]?.[0] as string | undefined;
    const parsed = JSON.parse(call!);
    expect(parsed.api_key).toBe("[REDACTED]");
    expect(parsed["api-key"]).toBe("[REDACTED]");

    spy.mockRestore();
  });

  it("child() merges bindings", () => {
    const parent = new ConsoleLogger({ app: "tec-payment" });
    const child = parent.child({ component: "test" });
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    child.info("test");

    const call = spy.mock.calls[0]?.[0] as string | undefined;
    const parsed = JSON.parse(call!);
    expect(parsed.app).toBe("tec-payment");
    expect(parsed.component).toBe("test");

    spy.mockRestore();
  });

  it("error log includes error details", () => {
    const logger = new ConsoleLogger();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("something went wrong", new Error("boom"));

    const call = spy.mock.calls[0]?.[0] as string | undefined;
    const parsed = JSON.parse(call!);
    expect(parsed.level).toBe("error");
    expect(parsed.error).toEqual({ name: "Error", message: "boom" });

    spy.mockRestore();
  });
});
