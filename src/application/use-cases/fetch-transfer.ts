import type { PaymentProvider } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import type { Transfer } from "../../domain/transfer/transfer.js";
import type { Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";

export interface FetchTransferDeps {
  readonly provider: PaymentProvider;
  readonly logger: Logger;
}

export async function fetchTransfer(
  deps: FetchTransferDeps,
  id: string,
): Promise<Result<Transfer, PaymentError>> {
  deps.logger.info("use-case: fetchTransfer", {
    provider: deps.provider.id,
    transferId: id,
  });

  return deps.provider.fetchTransfer(id);
}
