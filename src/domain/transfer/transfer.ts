import type { Money } from "../money/money.js";
import type { Provider } from "../provider/provider.js";
import type { Metadata } from "../metadata/metadata.js";
import type { TransferStatus } from "./transfer-status.js";
import type { TransferRecipient } from "./transfer-recipient.js";

export interface Transfer {
  readonly id: string;
  readonly providerId: Provider;
  readonly amount: Money;
  readonly recipient: TransferRecipient;
  readonly status: TransferStatus;
  readonly reference: string;
  readonly reason?: string;
  readonly createdAt: Date;
  readonly completedAt?: Date;
  readonly failureReason?: string;
  readonly metadata: Metadata;
}
