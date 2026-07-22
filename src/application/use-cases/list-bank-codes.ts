import type { PaymentProvider } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import type { Currency } from "../../domain/money/currency.js";
import type { BankCode } from "../../domain/transfer/bank-code.js";
import type { Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";

export interface ListBankCodesDeps {
  readonly provider: PaymentProvider;
  readonly logger: Logger;
}

export async function listBankCodes(
  deps: ListBankCodesDeps,
  currency: Currency,
): Promise<Result<ReadonlyArray<BankCode>, PaymentError>> {
  deps.logger.info("use-case: listBankCodes", {
    provider: deps.provider.id,
    currency,
  });

  return deps.provider.listBankCodes({ currency });
}
