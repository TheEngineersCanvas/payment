import type { Currency } from "../money/currency.js";
import type { Metadata } from "../metadata/metadata.js";

export interface TransferRecipient {
  readonly code: string;
  readonly name: string;
  readonly accountNumber: string;
  readonly bankCode: string;
  readonly currency: Currency;
  readonly createdAt: Date;
  readonly metadata: Metadata;
}
