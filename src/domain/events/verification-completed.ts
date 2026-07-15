import type { EventBase } from "./event-base.js";
import type { Payment } from "../payment/payment.js";

export interface VerificationCompleted extends EventBase {
  readonly type: "verification.completed";
  readonly payment: Payment;
}
