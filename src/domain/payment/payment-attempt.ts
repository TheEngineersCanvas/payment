import type { Money } from "../money/money.js";
import type { PaymentStatus } from "./payment-status.js";
import type { PaymentChannel } from "./payment-channel.js";

export interface PaymentAttempt {
  readonly id: string;
  readonly status: PaymentStatus;
  readonly channel: PaymentChannel;
  readonly ipAddress?: string;
  readonly fees?: Money;
  readonly authorizationCode?: string;
  readonly bin?: string;
  readonly last4?: string;
  readonly bank?: string;
  readonly attemptedAt: Date;
}
