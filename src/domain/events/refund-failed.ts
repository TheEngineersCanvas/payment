import type { EventBase } from "./event-base.js";
import type { Refund } from "../refund/refund.js";

export interface RefundFailed extends EventBase {
  readonly type: "refund.failed";
  readonly refund: Refund;
  readonly reason: string;
}
