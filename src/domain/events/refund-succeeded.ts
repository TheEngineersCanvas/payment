import type { EventBase } from "./event-base.js";
import type { Refund } from "../refund/refund.js";

export interface RefundSucceeded extends EventBase {
  readonly type: "refund.succeeded";
  readonly refund: Refund;
}
