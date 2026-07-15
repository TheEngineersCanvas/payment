import type { EventBase } from "./event-base.js";
import type { Payment } from "../payment/payment.js";

export interface PaymentInitialized extends EventBase {
  readonly type: "payment.initialized";
  readonly payment: Payment;
}
