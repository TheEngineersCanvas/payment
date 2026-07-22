import type { PaymentProvider, ListQuery, Page } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import type { Transfer } from "../../domain/transfer/transfer.js";
import type { Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";

export interface ListTransfersDeps {
  readonly provider: PaymentProvider;
  readonly logger: Logger;
}

export async function listTransfers(
  deps: ListTransfersDeps,
  query: ListQuery,
): Promise<Result<Page<Transfer>, PaymentError>> {
  deps.logger.info("use-case: listTransfers", {
    provider: deps.provider.id,
  });

  return deps.provider.listTransfers(query);
}
