export type TransferStatus =
  | { readonly kind: "pending" }
  | { readonly kind: "processing" }
  | { readonly kind: "succeeded"; readonly settledAt: Date }
  | { readonly kind: "failed"; readonly reason: string; readonly failedAt: Date }
  | { readonly kind: "reversed"; readonly reversedAt: Date };

export type TransferStatusKind = TransferStatus["kind"];

export function isFinalTransferStatus(status: TransferStatus): boolean {
  return status.kind === "succeeded" || status.kind === "failed" || status.kind === "reversed";
}
