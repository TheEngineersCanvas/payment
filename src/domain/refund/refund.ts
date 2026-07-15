import type { Money } from "../money/money.js";
import type { Provider } from "../provider/provider.js";
import type { Metadata } from "../metadata/metadata.js";
import type { RefundStatus } from "./refund-status.js";

export interface Refund {
  readonly id: string;
  readonly paymentId: string;
  readonly providerId: Provider;
  readonly amount: Money;
  readonly reason: string;
  readonly status: RefundStatus;
  readonly initiatedAt: Date;
  readonly completedAt?: Date;
  readonly failureReason?: string;
  readonly metadata: Metadata;
}
