import type { PaymentProvider, ResolveAccountResult } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import type { Currency } from "../../domain/money/currency.js";
import type { Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";

export interface ResolveAccountDeps {
  readonly provider: PaymentProvider;
  readonly logger: Logger;
}

export interface ResolveAccountInput {
  readonly accountNumber: string;
  readonly bankCode: string;
  readonly currency: Currency;
}

export async function resolveAccount(
  deps: ResolveAccountDeps,
  input: ResolveAccountInput,
): Promise<Result<ResolveAccountResult, PaymentError>> {
  deps.logger.info("use-case: resolveAccount", {
    provider: deps.provider.id,
    bankCode: input.bankCode,
  });

  return deps.provider.resolveAccount(input);
}
