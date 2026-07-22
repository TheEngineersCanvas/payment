import type { PaymentProvider, CreateRecipientInput } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import type { Clock } from "../ports/clock.js";
import type { TransferRecipient } from "../../domain/transfer/transfer-recipient.js";
import type { Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";

export interface CreateRecipientDeps {
  readonly provider: PaymentProvider;
  readonly logger: Logger;
  readonly clock: Clock;
}

export async function createRecipient(
  deps: CreateRecipientDeps,
  input: CreateRecipientInput,
): Promise<Result<TransferRecipient, PaymentError>> {
  deps.logger.info("use-case: createRecipient", {
    provider: deps.provider.id,
    bankCode: input.bankCode,
  });

  return deps.provider.createRecipient(input);
}
