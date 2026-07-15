import type { PaymentProvider } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import type { Clock } from "../ports/clock.js";
import type { EventBus } from "../ports/event-bus.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { Payment } from "../../domain/payment/payment.js";
import type { PaymentReference } from "../../domain/reference/payment-reference.js";
import type { Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";

export interface VerifyPaymentDeps {
  readonly provider: PaymentProvider;
  readonly eventBus: EventBus;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

export async function verifyPayment(
  deps: VerifyPaymentDeps,
  reference: PaymentReference,
): Promise<Result<Payment, PaymentError>> {
  deps.logger.info("use-case: verifyPayment", { reference });

  const result = await deps.provider.verify(reference);

  if (!result.ok) return result;

  const payment = result.value;

  if (payment.status.kind === "success") {
    deps.eventBus.emit({
      type: "payment.succeeded",
      payment,
      occurredAt: deps.clock.now(),
      correlationId: deps.idGenerator.generate(),
    });
  } else if (payment.status.kind === "failed") {
    deps.eventBus.emit({
      type: "payment.failed",
      payment,
      reason: payment.failureReason ?? "unknown",
      occurredAt: deps.clock.now(),
      correlationId: deps.idGenerator.generate(),
    });
  }

  return result;
}
