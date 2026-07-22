import type { BankCode } from "../../../domain/transfer/bank-code.js";
import type { Transfer } from "../../../domain/transfer/transfer.js";
import type { TransferRecipient } from "../../../domain/transfer/transfer-recipient.js";
import type { TransferStatus } from "../../../domain/transfer/transfer-status.js";
import { Currency } from "../../../domain/money/currency.js";
import { Money } from "../../../domain/money/money.js";
import { Provider } from "../../../domain/provider/provider.js";
import { ProviderError } from "../../../errors/provider-error.js";
import type { Metadata } from "../../../domain/metadata/metadata.js";
import type {
  PaystackBank,
  PaystackRecipientData,
  PaystackTransferData,
  PaystackBankListResponse,
  PaystackCreateRecipientResponse,
  PaystackTransferResponse,
  PaystackTransferListResponse,
} from "./paystack-transfer-types.js";
import type { Page } from "../../../application/ports/payment-provider.js";

function emptyMetadata(): Metadata {
  return Object.freeze({}) as Metadata;
}

function mapPaystackBank(bank: PaystackBank): BankCode {
  return {
    code: bank.code,
    name: bank.name,
    currency: Currency(bank.currency),
  };
}

export function mapPaystackBankListResponse(
  response: PaystackBankListResponse,
): ReadonlyArray<BankCode> {
  if (!response.status) {
    throw new ProviderError(response.message, {
      provider: Provider("paystack"),
      httpStatus: 422,
      isRetryable: false,
    });
  }

  return response.data.map(mapPaystackBank);
}

function mapPaystackTransferStatus(status: string, data: PaystackTransferData): TransferStatus {
  switch (status) {
    case "pending":
      return { kind: "pending" };
    case "processing":
      return { kind: "processing" };
    case "success":
      return {
        kind: "succeeded",
        settledAt: data.transferred_at ? new Date(data.transferred_at) : new Date(data.updated_at),
      };
    case "failed":
      return {
        kind: "failed",
        reason: data.reason || "transfer_failed",
        failedAt: new Date(data.updated_at),
      };
    case "reversed":
      return {
        kind: "reversed",
        reversedAt: new Date(data.updated_at),
      };
    default:
      return { kind: "pending" };
  }
}

function mapPaystackRecipient(data: PaystackRecipientData): TransferRecipient {
  return {
    code: data.recipient_code,
    name: data.name,
    accountNumber: data.details.account_number,
    bankCode: data.details.bank_code,
    currency: Currency(data.currency),
    createdAt: new Date(data.created_at),
    metadata: data.metadata ? Object.freeze({ ...data.metadata }) : emptyMetadata(),
  };
}

export function mapPaystackCreateRecipientResponse(
  response: PaystackCreateRecipientResponse,
): TransferRecipient {
  if (!response.status) {
    throw new ProviderError(response.message, {
      provider: Provider("paystack"),
      httpStatus: 422,
      isRetryable: false,
    });
  }

  return mapPaystackRecipient(response.data);
}

export function mapPaystackTransferResponse(
  response: PaystackTransferResponse,
  recipient: TransferRecipient,
): Transfer {
  if (!response.status) {
    throw new ProviderError(response.message, {
      provider: Provider("paystack"),
      httpStatus: 422,
      isRetryable: false,
    });
  }

  const data = response.data;
  return {
    id: String(data.id),
    providerId: Provider("paystack"),
    amount: Money({ amount: data.amount, currency: data.currency }),
    recipient,
    status: mapPaystackTransferStatus(data.status, data),
    reference: data.reference,
    reason: data.reason || undefined,
    createdAt: new Date(data.created_at),
    completedAt: data.transferred_at ? new Date(data.transferred_at) : undefined,
    failureReason: data.status === "failed" ? (data.reason || undefined) : undefined,
    metadata: emptyMetadata(),
  };
}

function mapPaystackTransferToDomain(
  data: PaystackTransferData,
  recipient: TransferRecipient,
): Transfer {
  return {
    id: String(data.id),
    providerId: Provider("paystack"),
    amount: Money({ amount: data.amount, currency: data.currency }),
    recipient,
    status: mapPaystackTransferStatus(data.status, data),
    reference: data.reference,
    reason: data.reason || undefined,
    createdAt: new Date(data.created_at),
    completedAt: data.transferred_at ? new Date(data.transferred_at) : undefined,
    failureReason: data.status === "failed" ? (data.reason || undefined) : undefined,
    metadata: emptyMetadata(),
  };
}

export function mapPaystackTransferListResponse(
  response: PaystackTransferListResponse,
  getRecipient: (id: string) => TransferRecipient | null,
): Page<Transfer> {
  if (!response.status) {
    throw new ProviderError(response.message, {
      provider: Provider("paystack"),
      httpStatus: 422,
      isRetryable: false,
    });
  }

  return {
    items: response.data.map((d) => {
      const recipient = getRecipient(String(d.recipient));
      if (!recipient) {
        return mapPaystackTransferToDomain(d, {
          code: String(d.recipient),
          name: "unknown",
          accountNumber: "unknown",
          bankCode: "unknown",
          currency: Currency(d.currency),
          createdAt: new Date(d.created_at),
          metadata: emptyMetadata(),
        });
      }
      return mapPaystackTransferToDomain(d, recipient);
    }),
    total: response.meta.total,
    page: response.meta.page,
    perPage: response.meta.perPage,
  };
}
