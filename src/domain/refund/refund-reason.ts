declare const RefundReasonSymbol: unique symbol;

export type RefundReason = string & { readonly [RefundReasonSymbol]: true };

export function RefundReason(value: string): RefundReason {
  return value.trim().toLowerCase() as RefundReason;
}
