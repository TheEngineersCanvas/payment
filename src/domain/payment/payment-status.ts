export type PaymentStatus =
  | { readonly kind: "initialized" }
  | { readonly kind: "pending" }
  | { readonly kind: "success"; readonly paidAt: Date }
  | { readonly kind: "failed"; readonly reason: string; readonly failedAt: Date }
  | { readonly kind: "abandoned" }
  | { readonly kind: "refunded"; readonly refundedAt: Date; readonly refundId: string };

export type PaymentStatusKind = PaymentStatus["kind"];

export function isFinalStatus(status: PaymentStatus): boolean {
  return status.kind === "success" || status.kind === "failed" || status.kind === "refunded";
}

export function isTransitionAllowed(
  from: PaymentStatusKind,
  to: PaymentStatusKind,
): boolean {
  const allowed: Record<PaymentStatusKind, ReadonlySet<PaymentStatusKind>> = {
    initialized: new Set(["pending", "failed", "abandoned"]),
    pending: new Set(["success", "failed", "abandoned"]),
    success: new Set(["refunded"]),
    failed: new Set([]),
    abandoned: new Set([]),
    refunded: new Set([]),
  };
  return allowed[from]?.has(to) ?? false;
}
