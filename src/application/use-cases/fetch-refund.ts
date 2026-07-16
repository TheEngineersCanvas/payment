import type { PaymentProvider } from "../ports/payment-provider.js";
import type { Clock } from "../../application/ports/clock.js";
import type { Logger } from "../ports/logger.js";
import type { Refund } from "../../domain/refund/refund.js";
import { err, ok, type Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";
import { InternalError } from "../../errors/internal-error.js";
import { mapRefundResultToRefund } from "../../infrastructure/providers/paystack/paystack-mapper.js";
import type { Provider } from "../../domain/provider/provider.js";

export interface FetchRefundDeps {
  readonly provider: PaymentProvider;
  readonly logger: Logger;
  readonly clock: Clock;
}

export async function fetchRefund(
  deps: FetchRefundDeps,
  refundId: string,
): Promise<Result<Refund, PaymentError>> {
  deps.logger.info("use-case: fetchRefund", {
    provider: deps.provider.id,
    refundId,
  });

  if (!deps.provider.fetchRefund) {
    return err(new InternalError(
      `Provider ${deps.provider.id} does not support fetching individual refunds`,
    ));
  }

  const result = await deps.provider.fetchRefund(refundId);

  if (!result.ok) {
    deps.logger.error("use-case: fetchRefund failed", result.error, {
      provider: deps.provider.id,
      refundId,
    });
    return result;
  }

  const refund = mapRefundResultToRefund(
    result.value,
    deps.provider.id as Provider,
    deps.clock,
  );

  return ok(refund);
}
