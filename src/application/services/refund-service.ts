import type { PaymentProvider } from "../ports/payment-provider.js";
import type { Logger } from "../ports/logger.js";
import type { Clock } from "../ports/clock.js";
import type { EventBus } from "../ports/event-bus.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { Money } from "../../domain/money/money.js";
import type { Metadata } from "../../domain/metadata/metadata.js";
import type { Refund } from "../../domain/refund/refund.js";
import type { Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";
import { refundPayment } from "../use-cases/refund-payment.js";
import { fetchRefund } from "../use-cases/fetch-refund.js";

export interface RefundCreateInput {
  readonly paymentId: string;
  readonly amount?: Money;
  readonly reason: string;
  readonly reference?: string;
  readonly idempotencyKey?: string;
  readonly metadata?: Metadata;
}

export class RefundService {
  private readonly provider: PaymentProvider;
  private readonly eventBus: EventBus;
  private readonly logger: Logger;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;

  constructor(
    provider: PaymentProvider,
    deps: {
      readonly eventBus: EventBus;
      readonly logger: Logger;
      readonly clock: Clock;
      readonly idGenerator: IdGenerator;
    },
  ) {
    this.provider = provider;
    this.eventBus = deps.eventBus;
    this.logger = deps.logger;
    this.clock = deps.clock;
    this.idGenerator = deps.idGenerator;
  }

  async create(input: RefundCreateInput): Promise<Result<Refund, PaymentError>> {
    return refundPayment(
      {
        provider: this.provider,
        eventBus: this.eventBus,
        logger: this.logger.child({ component: "refund-service" }),
        clock: this.clock,
        idGenerator: this.idGenerator,
      },
      input,
    );
  }

  async fetch(id: string): Promise<Result<Refund, PaymentError>> {
    return fetchRefund(
      {
        provider: this.provider,
        logger: this.logger.child({ component: "refund-service" }),
        clock: this.clock,
      },
      id,
    );
  }
}
