import type { EventBase } from "./event-base.js";
import type { Transfer } from "../transfer/transfer.js";

export interface TransferInitiated extends EventBase {
  readonly type: "transfer.initiated";
  readonly transfer: Transfer;
}
