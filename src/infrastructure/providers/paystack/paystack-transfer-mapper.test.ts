import { describe, it, expect } from "vitest";
import {
  mapPaystackBankListResponse,
  mapPaystackCreateRecipientResponse,
  mapPaystackTransferResponse,
  mapPaystackTransferListResponse,
} from "./paystack-transfer-mapper.js";
import { ProviderError } from "../../../errors/provider-error.js";
import type {
  PaystackBankListResponse,
  PaystackCreateRecipientResponse,
  PaystackTransferResponse,
  PaystackTransferListResponse,
} from "./paystack-transfer-types.js";
import type { TransferRecipient } from "../../../domain/transfer/transfer-recipient.js";

describe("mapPaystackBankListResponse", () => {
  it("maps a bank list response", () => {
    const response: PaystackBankListResponse = {
      status: true,
      message: "Banks retrieved",
      data: [
        { id: 1, name: "Access Bank", code: "044", currency: "NGN" },
        { id: 2, name: "GTBank", code: "058", currency: "NGN" },
      ],
    };

    const banks = mapPaystackBankListResponse(response);
    expect(banks).toHaveLength(2);
    expect(banks[0]?.code).toBe("044");
    expect(banks[0]?.name).toBe("Access Bank");
    expect(banks[0]?.currency).toBe("NGN");
  });

  it("throws ProviderError when status is false", () => {
    const response: PaystackBankListResponse = {
      status: false,
      message: "No banks found",
      data: null as unknown as PaystackBankListResponse["data"],
    };

    expect(() => mapPaystackBankListResponse(response)).toThrow(ProviderError);
    expect(() => mapPaystackBankListResponse(response)).toThrow("No banks found");
  });
});

describe("mapPaystackCreateRecipientResponse", () => {
  it("maps a recipient creation response", () => {
    const response: PaystackCreateRecipientResponse = {
      status: true,
      message: "Recipient created",
      data: {
        id: 123,
        name: "John Doe",
        type: "nuban",
        currency: "NGN",
        domain: "test",
        details: {
          account_number: "0123456789",
          account_name: "John Doe",
          bank_code: "044",
          bank_name: "Access Bank",
        },
        active: true,
        is_deleted: false,
        created_at: "2026-07-20T10:00:00.000Z",
        updated_at: "2026-07-20T10:00:00.000Z",
        recipient_code: "RCP_abc123",
        metadata: null,
      },
    };

    const recipient = mapPaystackCreateRecipientResponse(response);
    expect(recipient.code).toBe("RCP_abc123");
    expect(recipient.name).toBe("John Doe");
    expect(recipient.accountNumber).toBe("0123456789");
    expect(recipient.bankCode).toBe("044");
    expect(recipient.currency).toBe("NGN");
  });

  it("throws ProviderError when status is false", () => {
    const response: PaystackCreateRecipientResponse = {
      status: false,
      message: "Invalid account",
      data: null as unknown as PaystackCreateRecipientResponse["data"],
    };

    expect(() => mapPaystackCreateRecipientResponse(response)).toThrow(ProviderError);
  });
});

describe("mapPaystackTransferResponse", () => {
  const recipient: TransferRecipient = {
    code: "RCP_abc123",
    name: "John Doe",
    accountNumber: "0123456789",
    bankCode: "044",
    currency: "NGN" as TransferRecipient["currency"],
    createdAt: new Date(),
    metadata: Object.freeze({}),
  };

  it("maps a successful transfer response", () => {
    const response: PaystackTransferResponse = {
      status: true,
      message: "Transfer created",
      data: {
        id: 500,
        integration: 1,
        domain: "test",
        amount: 1000000,
        currency: "NGN",
        source: "balance",
        reason: "Payout",
        recipient: 123,
        status: "success",
        transfer_code: "TRF_xyz",
        reference: "ref-001",
        failures: null,
        transferred_at: "2026-07-20T11:00:00.000Z",
        created_at: "2026-07-20T10:00:00.000Z",
        updated_at: "2026-07-20T11:00:00.000Z",
      },
    };

    const transfer = mapPaystackTransferResponse(response, recipient);
    expect(transfer.id).toBe("500");
    expect(transfer.status.kind).toBe("succeeded");
    expect(transfer.amount.amount).toBe(1000000);
    expect(transfer.reference).toBe("ref-001");
    expect(transfer.reason).toBe("Payout");
    expect(transfer.recipient.code).toBe("RCP_abc123");
  });

  it("maps a failed transfer response", () => {
    const response: PaystackTransferResponse = {
      status: true,
      message: "Transfer record",
      data: {
        id: 501,
        integration: 1,
        domain: "test",
        amount: 500000,
        currency: "NGN",
        source: "balance",
        reason: "Insufficient funds",
        recipient: 123,
        status: "failed",
        transfer_code: "TRF_fail",
        reference: "ref-002",
        failures: null,
        transferred_at: null,
        created_at: "2026-07-20T10:00:00.000Z",
        updated_at: "2026-07-20T10:01:00.000Z",
      },
    };

    const transfer = mapPaystackTransferResponse(response, recipient);
    expect(transfer.status.kind).toBe("failed");
    expect(transfer.failureReason).toBe("Insufficient funds");
  });

  it("maps a reversed transfer response", () => {
    const response: PaystackTransferResponse = {
      status: true,
      message: "Transfer reversed",
      data: {
        id: 502,
        integration: 1,
        domain: "test",
        amount: 200000,
        currency: "NGN",
        source: "balance",
        reason: "",
        recipient: 123,
        status: "reversed",
        transfer_code: "TRF_rev",
        reference: "ref-003",
        failures: null,
        transferred_at: null,
        created_at: "2026-07-20T10:00:00.000Z",
        updated_at: "2026-07-20T12:00:00.000Z",
      },
    };

    const transfer = mapPaystackTransferResponse(response, recipient);
    expect(transfer.status.kind).toBe("reversed");
  });

  it("throws ProviderError when status is false", () => {
    const response: PaystackTransferResponse = {
      status: false,
      message: "Recipient not found",
      data: null as unknown as PaystackTransferResponse["data"],
    };

    expect(() => mapPaystackTransferResponse(response, recipient)).toThrow(ProviderError);
  });
});

describe("mapPaystackTransferListResponse", () => {
  const noopRecipient = () => null;

  it("maps a transfer list response", () => {
    const response: PaystackTransferListResponse = {
      status: true,
      message: "Transfers retrieved",
      data: [
        {
          id: 500,
          integration: 1,
          domain: "test",
          amount: 1000000,
          currency: "NGN",
          source: "balance",
          reason: "Payout",
          recipient: 123,
          status: "success",
          transfer_code: "TRF_xyz",
          reference: "ref-001",
          failures: null,
          transferred_at: "2026-07-20T11:00:00.000Z",
          created_at: "2026-07-20T10:00:00.000Z",
          updated_at: "2026-07-20T11:00:00.000Z",
        },
      ],
      meta: { total: 1, skipped: 0, perPage: 50, page: 1, pageCount: 1 },
    };

    const page = mapPaystackTransferListResponse(response, noopRecipient);
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(1);
    expect(page.items[0]?.status.kind).toBe("succeeded");
    expect(page.items[0]?.recipient.code).toBe("123");
  });

  it("throws ProviderError when status is false", () => {
    const response: PaystackTransferListResponse = {
      status: false,
      message: "Invalid query",
      data: null as unknown as PaystackTransferListResponse["data"],
      meta: null as unknown as PaystackTransferListResponse["meta"],
    };

    expect(() => mapPaystackTransferListResponse(response, noopRecipient)).toThrow(ProviderError);
  });
});
