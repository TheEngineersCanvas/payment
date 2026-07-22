import type { PaymentProvider, InitiateTransferInput } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import type { Clock } from "../ports/clock.js";
import type { EventBus } from "../ports/event-bus.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { Transfer } from "../../domain/transfer/transfer.js";
import type { Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";

export interface InitiateTransferDeps {
  readonly provider: PaymentProvider;
  readonly eventBus: EventBus;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

export async function initiateTransfer(
  deps: InitiateTransferDeps,
  input: InitiateTransferInput,
): Promise<Result<Transfer, PaymentError>> {
  deps.logger.info("use-case: initiateTransfer", {
    provider: deps.provider.id,
    reference: input.reference,
  });

  const result = await deps.provider.initiateTransfer(input);

  if (!result.ok) {
    deps.logger.error("use-case: initiateTransfer failed", result.error, {
      provider: deps.provider.id,
      reference: input.reference,
    });
    return result;
  }

  const correlationId = input.correlationId ?? deps.idGenerator.generate();

  if (result.value.status.kind === "failed") {
    deps.eventBus.emit({
      type: "transfer.failed",
      transfer: result.value,
      reason: result.value.failureReason ?? "transfer_failed",
      occurredAt: deps.clock.now(),
      correlationId,
    });
  } else {
    deps.eventBus.emit({
      type: "transfer.initiated",
      transfer: result.value,
      occurredAt: deps.clock.now(),
      correlationId,
    });
  }

  return result;
}
