import type { EventBase } from "./event-base.js";
import type { Refund } from "../refund/refund.js";

export interface RefundInitiated extends EventBase {
  readonly type: "refund.initiated";
  readonly refund: Refund;
}
