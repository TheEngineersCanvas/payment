import type { Logger } from "../ports/logger.js";
import type { Clock } from "../ports/clock.js";
import type { EventBus } from "../ports/event-bus.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { PaymentProvider, ListQuery, Page, CreateRecipientInput, InitiateTransferInput, ResolveAccountResult } from "../ports/payment-provider.js";
import type { Currency } from "../../domain/money/currency.js";
import type { Transfer } from "../../domain/transfer/transfer.js";
import type { TransferRecipient } from "../../domain/transfer/transfer-recipient.js";
import type { BankCode } from "../../domain/transfer/bank-code.js";
import type { Result } from "../../shared/result/result.js";
import type { PaymentError } from "../../errors/payment-error.js";
import { listBankCodes } from "../use-cases/list-bank-codes.js";
import { resolveAccount } from "../use-cases/resolve-account.js";
import { createRecipient } from "../use-cases/create-recipient.js";
import { initiateTransfer } from "../use-cases/initiate-transfer.js";
import { fetchTransfer } from "../use-cases/fetch-transfer.js";
import { listTransfers } from "../use-cases/list-transfers.js";

export class TransferService {
  constructor(
    private readonly provider: PaymentProvider,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {}

  async listBankCodes(currency: Currency): Promise<Result<ReadonlyArray<BankCode>, PaymentError>> {
    return listBankCodes(
      { provider: this.provider, logger: this.logger },
      currency,
    );
  }

  async resolveAccount(input: { accountNumber: string; bankCode: string; currency: Currency }): Promise<Result<ResolveAccountResult, PaymentError>> {
    return resolveAccount(
      { provider: this.provider, logger: this.logger },
      input,
    );
  }

  async createRecipient(input: CreateRecipientInput): Promise<Result<TransferRecipient, PaymentError>> {
    return createRecipient(
      { provider: this.provider, logger: this.logger, clock: this.clock },
      input,
    );
  }

  async initiate(input: InitiateTransferInput): Promise<Result<Transfer, PaymentError>> {
    return initiateTransfer(
      {
        provider: this.provider,
        eventBus: this.eventBus,
        logger: this.logger,
        clock: this.clock,
        idGenerator: this.idGenerator,
      },
      input,
    );
  }

  async fetch(id: string): Promise<Result<Transfer, PaymentError>> {
    return fetchTransfer(
      { provider: this.provider, logger: this.logger },
      id,
    );
  }

  async list(query: ListQuery): Promise<Result<Page<Transfer>, PaymentError>> {
    return listTransfers(
      { provider: this.provider, logger: this.logger },
      query,
    );
  }
}
