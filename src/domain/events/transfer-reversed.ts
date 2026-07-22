import type { EventBase } from "./event-base.js";
import type { Transfer } from "../transfer/transfer.js";

export interface TransferReversed extends EventBase {
  readonly type: "transfer.reversed";
  readonly transfer: Transfer;
}
