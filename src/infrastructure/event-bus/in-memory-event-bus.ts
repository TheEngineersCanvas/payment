import type { EventBus, EventHandler, Unsubscribe } from "../../application/ports/event-bus.js";
import type { Logger } from "../../application/ports/logger.js";
import type { PaymentEvent, PaymentEventType } from "../../domain/events/payment-events.js";

interface Subscription {
  readonly type: PaymentEventType | "*";
  readonly handler: EventHandler;
}

export class InMemoryEventBus implements EventBus {
  private readonly subscriptions: Subscription[] = [];
  private readonly logger: Logger;
  private dispatching = false;
  private readonly pending: PaymentEvent[] = [];

  constructor(logger: Logger) {
    this.logger = logger;
  }

  emit(event: PaymentEvent): void {
    if (this.dispatching) {
      this.pending.push(event);
      return;
    }

    this.dispatching = true;
    try {
      this.dispatch(event);
    } finally {
      this.dispatching = false;
      while (this.pending.length > 0) {
        const next = this.pending.shift()!;
        this.emit(next);
      }
    }
  }

  on<T extends PaymentEventType>(type: T, handler: EventHandler<T>): Unsubscribe {
    const sub: Subscription = { type, handler: handler as unknown as EventHandler };
    this.subscriptions.push(sub);
    return () => {
      const idx = this.subscriptions.indexOf(sub);
      if (idx >= 0) this.subscriptions.splice(idx, 1);
    };
  }

  onAny(handler: EventHandler): Unsubscribe {
    const sub: Subscription = { type: "*", handler };
    this.subscriptions.push(sub);
    return () => {
      const idx = this.subscriptions.indexOf(sub);
      if (idx >= 0) this.subscriptions.splice(idx, 1);
    };
  }

  private dispatch(event: PaymentEvent): void {
    for (const sub of [...this.subscriptions]) {
      if (sub.type !== "*" && sub.type !== event.type) continue;

      try {
        const result = sub.handler(event);
        if (result instanceof Promise) {
          result.catch((err) => {
            this.logger.error("event handler rejected", err, {
              eventType: event.type,
              correlationId: event.correlationId,
            });
          });
        }
      } catch (err) {
        this.logger.error("event handler threw", err instanceof Error ? err : undefined, {
          eventType: event.type,
          correlationId: event.correlationId,
        });
      }
    }
  }
}
