import type { EventBase } from "./event-base.js";
import type { Transfer } from "../transfer/transfer.js";

export interface TransferFailed extends EventBase {
  readonly type: "transfer.failed";
  readonly transfer: Transfer;
  readonly reason: string;
}
