import type { EventBase } from "./event-base.js";
import type { Payment } from "../payment/payment.js";

export interface PaymentSucceeded extends EventBase {
  readonly type: "payment.succeeded";
  readonly payment: Payment;
}
