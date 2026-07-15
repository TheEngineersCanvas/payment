export type RefundStatus =
  | { readonly kind: "pending" }
  | { readonly kind: "processing" }
  | { readonly kind: "succeeded"; readonly settledAt: Date }
  | { readonly kind: "failed"; readonly reason: string; readonly failedAt: Date };

export type RefundStatusKind = RefundStatus["kind"];

export function isFinalRefundStatus(status: RefundStatus): boolean {
  return status.kind === "succeeded" || status.kind === "failed";
}
