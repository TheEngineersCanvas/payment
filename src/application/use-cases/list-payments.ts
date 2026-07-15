import type { PaymentProvider, ListQuery, Page } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import type { Payment } from "../../domain/payment/payment.js";
import type { Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";

export interface ListPaymentsDeps {
  readonly provider: PaymentProvider;
  readonly logger: Logger;
}

export async function listPayments(
  deps: ListPaymentsDeps,
  query: ListQuery,
): Promise<Result<Page<Payment>, PaymentError>> {
  deps.logger.info("use-case: listPayments", {
    page: query.page ? String(query.page) : "1",
    perPage: query.perPage ? String(query.perPage) : "50",
  });
  return deps.provider.list(query);
}
