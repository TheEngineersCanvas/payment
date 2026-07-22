import { describe, it, expect, vi } from "vitest";
import { initiateTransfer } from "./initiate-transfer.js";
import { Provider } from "../../domain/provider/provider.js";
import { Money } from "../../domain/money/money.js";
import { Currency } from "../../domain/money/currency.js";
import type { PaymentProvider, InitiateTransferInput } from "../ports/payment-provider.js";
import type { TransferRecipient } from "../../domain/transfer/transfer-recipient.js";
import type { PaymentError } from "../../errors/payment-error.js";

const fakeLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  child: vi.fn().mockReturnThis(),
};

const fakeEventBus = { emit: vi.fn(), on: vi.fn(), onAny: vi.fn() };
const fakeClock = { now: () => new Date("2026-07-20T12:00:00Z") };
const fakeIdGenerator = { generate: () => "gen-id-999" };

const sampleInput: InitiateTransferInput = {
  amount: Money({ amount: 1000000, currency: "NGN" }),
  recipientCode: "RCP_abc",
  reference: "ref-trf-001",
  reason: "Payout",
  currency: Currency("NGN"),
};

const mockRecipient: TransferRecipient = {
  code: "RCP_abc",
  name: "John Doe",
  accountNumber: "0123456789",
  bankCode: "044",
  currency: Currency("NGN"),
  createdAt: new Date(),
  metadata: Object.freeze({}),
};

function makeDeps(overrides?: Partial<InitiateTransferDeps>) {
  return {
    provider: {
      id: Provider("paystack"),
      capabilities: {} as PaymentProvider["capabilities"],
      initialize: vi.fn(),
      verify: vi.fn(),
      fetch: vi.fn(),
      list: vi.fn(),
      refund: vi.fn(),
      parseWebhook: vi.fn(),
      health: vi.fn(),
      listBankCodes: vi.fn(),
      resolveAccount: vi.fn(),
      createRecipient: vi.fn(),
      initiateTransfer: vi.fn(),
      fetchTransfer: vi.fn(),
      listTransfers: vi.fn(),
      ...overrides?.provider,
    },
    eventBus: overrides?.eventBus ?? fakeEventBus,
    logger: overrides?.logger ?? fakeLogger,
    clock: overrides?.clock ?? fakeClock,
    idGenerator: overrides?.idGenerator ?? fakeIdGenerator,
  };
}

type InitiateTransferDeps = Parameters<typeof initiateTransfer>[0];

describe("initiateTransfer", () => {
  it("initiates a transfer successfully", async () => {
    const deps = makeDeps({ eventBus: { emit: vi.fn(), on: vi.fn(), onAny: vi.fn() } });
    const mockTransfer = {
      id: "500",
      providerId: Provider("paystack"),
      amount: sampleInput.amount,
      recipient: mockRecipient,
      status: { kind: "pending" } as const,
      reference: sampleInput.reference,
      reason: sampleInput.reason,
      createdAt: new Date(),
      metadata: Object.freeze({}),
    };

    vi.mocked(deps.provider.initiateTransfer).mockResolvedValue({
      ok: true,
      value: mockTransfer,
    });

    const result = await initiateTransfer(deps, sampleInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe("500");
      expect(result.value.reference).toBe("ref-trf-001");
    }
    expect(deps.eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "transfer.initiated" }),
    );
  });

  it("emits transfer.failed on failed transfer", async () => {
    const deps = makeDeps({ eventBus: { emit: vi.fn(), on: vi.fn(), onAny: vi.fn() } });
    const mockTransfer = {
      id: "501",
      providerId: Provider("paystack"),
      amount: sampleInput.amount,
      recipient: mockRecipient,
      status: { kind: "failed", reason: "Insufficient funds", failedAt: new Date() } as const,
      reference: sampleInput.reference,
      reason: sampleInput.reason,
      createdAt: new Date(),
      failureReason: "Insufficient funds",
      metadata: Object.freeze({}),
    };

    vi.mocked(deps.provider.initiateTransfer).mockResolvedValue({
      ok: true,
      value: mockTransfer,
    });

    const result = await initiateTransfer(deps, sampleInput);

    expect(result.ok).toBe(true);
    expect(deps.eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "transfer.failed" }),
    );
  });

  it("returns error when provider fails", async () => {
    const deps = makeDeps({ eventBus: { emit: vi.fn(), on: vi.fn(), onAny: vi.fn() } });
    vi.mocked(deps.provider.initiateTransfer).mockResolvedValue({
      ok: false,
      error: { code: "PROVIDER", message: "Insufficient balance", httpStatus: 400, isRetryable: false, correlationId: "err-1", category: "provider" } as PaymentError,
    } as never);

    const result = await initiateTransfer(deps, sampleInput);

    expect(result.ok).toBe(false);
    expect(deps.eventBus.emit).not.toHaveBeenCalled();
    expect(deps.logger.error).toHaveBeenCalled();
  });

  it("honors input correlationId", async () => {
    const deps = makeDeps({ eventBus: { emit: vi.fn(), on: vi.fn(), onAny: vi.fn() } });
    vi.mocked(deps.provider.initiateTransfer).mockResolvedValue({
      ok: true,
      value: {
        id: "500",
        providerId: Provider("paystack"),
        amount: sampleInput.amount,
        recipient: mockRecipient,
        status: { kind: "pending" } as const,
        reference: sampleInput.reference,
        createdAt: new Date(),
        metadata: Object.freeze({}),
      },
    });

    await initiateTransfer(deps, { ...sampleInput, correlationId: "my-custom-id" });

    expect(deps.eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: "my-custom-id" }),
    );
  });
});
