import type { Money } from "../money/money.js";
import type { PaymentReference } from "../reference/payment-reference.js";
import type { Metadata } from "../metadata/metadata.js";
import type { PaymentChannel } from "./payment-channel.js";
import type { Customer } from "../customer/customer.js";

export type CustomerReference =
  | { readonly kind: "new"; readonly email: string; readonly phone?: string; readonly name?: string }
  | { readonly kind: "existing"; readonly providerCustomerId: string }
  | { readonly kind: "inline"; readonly customer: Customer };

export interface PaymentRequest {
  readonly amount: Money;
  readonly customer: CustomerReference;
  readonly reference: PaymentReference;
  readonly callbackUrl?: string;
  readonly channels?: ReadonlyArray<PaymentChannel>;
  readonly metadata?: Metadata;
  readonly expiresAt?: Date;
  readonly idempotencyKey?: string;
}
