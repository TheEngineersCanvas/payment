import type { EventBase } from "./event-base.js";
import type { Payment } from "../payment/payment.js";

export interface PaymentFailed extends EventBase {
  readonly type: "payment.failed";
  readonly payment: Payment;
  readonly reason: string;
}
