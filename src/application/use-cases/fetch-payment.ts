import type { PaymentProvider } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import type { Payment } from "../../domain/payment/payment.js";
import type { Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";

export interface FetchPaymentDeps {
  readonly provider: PaymentProvider;
  readonly logger: Logger;
}

export async function fetchPayment(
  deps: FetchPaymentDeps,
  id: string,
): Promise<Result<Payment, PaymentError>> {
  deps.logger.info("use-case: fetchPayment", { paymentId: id });
  return deps.provider.fetch(id);
}
