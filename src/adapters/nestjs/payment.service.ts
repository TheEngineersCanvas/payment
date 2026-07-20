import { Inject, Injectable } from "@nestjs/common";
import type { PaymentClient, HealthStatus } from "../../public-api/index.js";
import { TEC_PAYMENT_CLIENT } from "./constants.js";

@Injectable()
export class PaymentService {
  constructor(
    @Inject(TEC_PAYMENT_CLIENT) private readonly client: PaymentClient,
  ) {}

  get payments(): PaymentClient["payments"] {
    return this.client.payments;
  }

  get refunds(): PaymentClient["refunds"] {
    return this.client.refunds;
  }

  get webhooks(): PaymentClient["webhooks"] {
    return this.client.webhooks;
  }

  get events(): PaymentClient["events"] {
    return this.client.events;
  }

  health(): Promise<ReadonlyArray<HealthStatus>> {
    return this.client.health();
  }
}
