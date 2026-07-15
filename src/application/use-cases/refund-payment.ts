import type { PaymentProvider } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import type { Clock } from "../ports/clock.js";
import type { EventBus } from "../ports/event-bus.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { Money } from "../../domain/money/money.js";
import type { Metadata } from "../../domain/metadata/metadata.js";
import type { Refund } from "../../domain/refund/refund.js";
import type { Result } from "../../shared/result/result.js";
import { err } from "../../shared/result/result.js";
import { ValidationError } from "../../errors/validation-error.js";
import type { PaymentError } from "../../errors/payment-error.js";
import { mapRefundResultToRefund } from "../../infrastructure/providers/paystack/paystack-mapper.js";

export interface RefundPaymentDeps {
  readonly provider: PaymentProvider;
  readonly eventBus: EventBus;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

export interface RefundPaymentInput {
  readonly paymentId: string;
  readonly amount?: Money;
  readonly reason: string;
  readonly metadata?: Metadata;
}

export async function refundPayment(
  deps: RefundPaymentDeps,
  input: RefundPaymentInput,
): Promise<Result<Refund, PaymentError>> {
  deps.logger.info("use-case: refundPayment", {
    provider: deps.provider.id,
    paymentId: input.paymentId,
  });

  if (input.amount && input.amount.amount <= 0) {
    return err(new ValidationError("Refund amount must be greater than zero"));
  }

  const correlationId = deps.idGenerator.generate();

  const providerInput = {
    paymentId: input.paymentId,
    amount: input.amount?.amount,
    reason: input.reason,
    reference: correlationId,
  };

  const result = await deps.provider.refund(providerInput);

  if (!result.ok) {
    deps.logger.error("use-case: refundPayment failed", result.error, {
      provider: deps.provider.id,
      paymentId: input.paymentId,
    });
    return result;
  }

  const refund = mapRefundResultToRefund(result.value, deps.provider.id, deps.clock);
  const now = deps.clock.now();

  if (refund.status.kind === "succeeded") {
    deps.eventBus.emit({
      type: "refund.succeeded",
      refund,
      occurredAt: now,
      correlationId,
    });
  } else if (refund.status.kind === "failed") {
    deps.eventBus.emit({
      type: "refund.failed",
      refund,
      reason: refund.failureReason ?? "refund_failed",
      occurredAt: now,
      correlationId,
    });
  } else {
    deps.eventBus.emit({
      type: "refund.initiated",
      refund,
      occurredAt: now,
      correlationId,
    });
  }

  return { ok: true, value: refund } as Result<Refund, PaymentError>;
}
