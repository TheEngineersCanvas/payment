import type { Currency } from "../money/currency.js";

export interface BankCode {
  readonly code: string;
  readonly name: string;
  readonly currency: Currency;
}
