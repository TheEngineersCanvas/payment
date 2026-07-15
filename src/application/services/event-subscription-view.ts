import type { EventSubscription } from "../../application/ports/event-bus.js";
import type { EventBus, Unsubscribe } from "../../application/ports/event-bus.js";
import type { PaymentEventType } from "../../domain/events/payment-events.js";
import type { EventHandler } from "../../application/ports/event-bus.js";

export class EventSubscriptionView implements EventSubscription {
  constructor(private readonly bus: EventBus) {}

  on<T extends PaymentEventType>(type: T, handler: EventHandler<T>): Unsubscribe {
    return this.bus.on(type, handler);
  }

  onAny(handler: EventHandler): Unsubscribe {
    return this.bus.onAny(handler);
  }
}
