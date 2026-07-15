import { describe, it, expect, vi } from "vitest";
import { InMemoryEventBus } from "./in-memory-event-bus.js";
import { NoopLogger } from "../logging/noop-logger.js";
import type { PaymentEvent } from "../../domain/events/payment-events.js";

function makeEvent(type: string, correlationId: string): PaymentEvent {
  return {
    type,
    correlationId,
    occurredAt: new Date(),
  } as PaymentEvent;
}

describe("InMemoryEventBus", () => {
  it("delivers events to matching handlers", () => {
    const bus = new InMemoryEventBus(new NoopLogger());
    const handler = vi.fn();

    bus.on("payment.initialized", handler);
    bus.emit(makeEvent("payment.initialized", "c1"));

    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not deliver events to non-matching handlers", () => {
    const bus = new InMemoryEventBus(new NoopLogger());
    const handler = vi.fn();

    bus.on("payment.succeeded", handler);
    bus.emit(makeEvent("payment.initialized", "c1"));

    expect(handler).not.toHaveBeenCalled();
  });

  it("onAny receives all events", () => {
    const bus = new InMemoryEventBus(new NoopLogger());
    const handler = vi.fn();

    bus.onAny(handler);
    bus.emit(makeEvent("payment.initialized", "c1"));
    bus.emit(makeEvent("payment.succeeded", "c2"));

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("returns unsubscribe function", () => {
    const bus = new InMemoryEventBus(new NoopLogger());
    const handler = vi.fn();

    const unsub = bus.on("payment.initialized", handler);
    unsub();
    bus.emit(makeEvent("payment.initialized", "c1"));

    expect(handler).not.toHaveBeenCalled();
  });

  it("isolates errors in handlers", () => {
    const bus = new InMemoryEventBus(new NoopLogger());
    const goodHandler = vi.fn();

    bus.on("payment.initialized", () => {
      throw new Error("boom");
    });
    bus.on("payment.initialized", goodHandler);

    bus.emit(makeEvent("payment.initialized", "c1"));

    expect(goodHandler).toHaveBeenCalled();
  });

  it("handles recursive emit (deferred dispatch)", () => {
    const bus = new InMemoryEventBus(new NoopLogger());
    const innerHandler = vi.fn();

    bus.on("payment.initialized", () => {
      bus.emit(makeEvent("payment.succeeded", "c2"));
    });
    bus.on("payment.succeeded", innerHandler);

    bus.emit(makeEvent("payment.initialized", "c1"));

    expect(innerHandler).toHaveBeenCalledOnce();
  });
});
