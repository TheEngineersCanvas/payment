import type { PaymentProvider } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import type { Clock } from "../ports/clock.js";
import type { EventBus } from "../ports/event-bus.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { PaymentRequest } from "../../domain/payment/payment-request.js";
import type { Payment } from "../../domain/payment/payment.js";
import type { Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";

export interface InitializePaymentDeps {
  readonly provider: PaymentProvider;
  readonly eventBus: EventBus;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

export async function initializePayment(
  deps: InitializePaymentDeps,
  input: PaymentRequest,
): Promise<Result<Payment, PaymentError>> {
  deps.logger.info("use-case: initializePayment", {
    reference: input.reference,
  });

  const result = await deps.provider.initialize(input);

  if (!result.ok) {
    return result;
  }

  deps.eventBus.emit({
    type: "payment.initialized",
    payment: result.value,
    occurredAt: deps.clock.now(),
    correlationId: input.correlationId ?? deps.idGenerator.generate(),
  });

  return result;
}
