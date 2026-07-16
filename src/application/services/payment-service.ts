import type { Logger } from "../ports/logger.js";
import type { Clock } from "../ports/clock.js";
import type { EventBus } from "../ports/event-bus.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { PaymentProvider, ListQuery, Page } from "../ports/payment-provider.js";
import type { Payment } from "../../domain/payment/payment.js";
import type { PaymentRequest } from "../../domain/payment/payment-request.js";
import type { PaymentReference } from "../../domain/reference/payment-reference.js";
import type { Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";
import { initializePayment } from "../use-cases/initialize-payment.js";
import { verifyPayment } from "../use-cases/verify-payment.js";
import { fetchPayment } from "../use-cases/fetch-payment.js";
import { listPayments } from "../use-cases/list-payments.js";

export class PaymentService {
  constructor(
    private readonly provider: PaymentProvider,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {}

  async initialize(req: PaymentRequest): Promise<Result<Payment, PaymentError>> {
    return initializePayment(
      {
        provider: this.provider,
        eventBus: this.eventBus,
        logger: this.logger,
        clock: this.clock,
        idGenerator: this.idGenerator,
      },
      req,
    );
  }

  async verify(reference: PaymentReference): Promise<Result<Payment, PaymentError>> {
    return verifyPayment(
      {
        provider: this.provider,
        eventBus: this.eventBus,
        logger: this.logger,
        clock: this.clock,
        idGenerator: this.idGenerator,
      },
      reference,
    );
  }

  async fetch(id: string): Promise<Result<Payment, PaymentError>> {
    return fetchPayment({ provider: this.provider, logger: this.logger }, id);
  }

  async list(query: ListQuery): Promise<Result<Page<Payment>, PaymentError>> {
    return listPayments({ provider: this.provider, logger: this.logger }, query);
  }
}
