import type { PaymentEvent, PaymentEventType } from "../../domain/events/payment-events.js";

export type EventHandler<T extends PaymentEventType = PaymentEventType> = (
  event: Extract<PaymentEvent, { type: T }>,
) => void | Promise<void>;

export type Unsubscribe = () => void;

export interface EventBus {
  emit(event: PaymentEvent): void;
  on<T extends PaymentEventType>(type: T, handler: EventHandler<T>): Unsubscribe;
  onAny(handler: EventHandler): Unsubscribe;
}

export interface EventSubscription {
  on<T extends PaymentEventType>(type: T, handler: EventHandler<T>): Unsubscribe;
  onAny(handler: EventHandler): Unsubscribe;
}
