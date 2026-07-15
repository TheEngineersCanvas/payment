import type { EventBase } from "./event-base.js";
import type { Payment } from "../payment/payment.js";

export interface PaymentPending extends EventBase {
  readonly type: "payment.pending";
  readonly payment: Payment;
}
