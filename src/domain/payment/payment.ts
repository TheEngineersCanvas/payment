import type { Money } from "../money/money.js";
import type { Provider } from "../provider/provider.js";
import type { PaymentReference } from "../reference/payment-reference.js";
import type { Metadata } from "../metadata/metadata.js";
import type { PaymentStatus } from "./payment-status.js";
import type { PaymentChannel } from "./payment-channel.js";
import type { PaymentAttempt } from "./payment-attempt.js";
import type { Customer } from "../customer/customer.js";

export interface Payment {
  readonly id?: string;
  readonly providerId: Provider;
  readonly reference: PaymentReference;
  readonly amount: Money;
  readonly fees?: Money;
  readonly netAmount?: Money;
  readonly status: PaymentStatus;
  readonly customer: Customer;
  readonly authorizationUrl?: string;
  readonly accessCode?: string;
  readonly channel?: PaymentChannel;
  readonly attempts: ReadonlyArray<PaymentAttempt>;
  readonly metadata: Metadata;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly paidAt?: Date;
  readonly failureReason?: string;
}
