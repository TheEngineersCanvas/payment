export interface PaystackBank {
  readonly id: number;
  readonly name: string;
  readonly code: string;
  readonly currency: string;
  readonly type?: string;
  readonly active?: boolean;
}

export interface PaystackBankListResponse {
  readonly status: boolean;
  readonly message: string;
  readonly data: ReadonlyArray<PaystackBank>;
}

export interface PaystackResolveAccountResponse {
  readonly status: boolean;
  readonly message: string;
  readonly data: {
    readonly account_number: string;
    readonly account_name: string;
    readonly bank_id?: number;
  };
}

export interface PaystackCreateRecipientRequest {
  readonly type: "nuban";
  readonly name: string;
  readonly account_number: string;
  readonly bank_code: string;
  readonly currency: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface PaystackRecipientDetails {
  readonly authorization_code?: string | null;
  readonly account_number: string;
  readonly account_name: string;
  readonly bank_code: string;
  readonly bank_name: string;
}

export interface PaystackRecipientData {
  readonly id: number;
  readonly name: string;
  readonly type: string;
  readonly currency: string;
  readonly description?: string;
  readonly metadata: Readonly<Record<string, string | number | boolean>> | null;
  readonly domain: string;
  readonly details: PaystackRecipientDetails;
  readonly active: boolean;
  readonly is_deleted: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly recipient_code: string;
}

export interface PaystackCreateRecipientResponse {
  readonly status: boolean;
  readonly message: string;
  readonly data: PaystackRecipientData;
}

export interface PaystackTransferRequest {
  readonly source: "balance";
  readonly amount: number;
  readonly recipient: string;
  readonly reference: string;
  readonly reason?: string;
  readonly currency: string;
}

export interface PaystackTransferData {
  readonly id: number;
  readonly integration: number;
  readonly domain: string;
  readonly amount: number;
  readonly currency: string;
  readonly source: string;
  readonly reason: string;
  readonly recipient: number;
  readonly status: string;
  readonly transfer_code: string;
  readonly reference: string;
  readonly failures: ReadonlyArray<unknown> | null;
  readonly transferred_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface PaystackTransferResponse {
  readonly status: boolean;
  readonly message: string;
  readonly data: PaystackTransferData;
}

export interface PaystackTransferListMeta {
  readonly total: number;
  readonly skipped: number;
  readonly perPage: number;
  readonly page: number;
  readonly pageCount: number;
}

export interface PaystackTransferListResponse {
  readonly status: boolean;
  readonly message: string;
  readonly data: ReadonlyArray<PaystackTransferData>;
  readonly meta: PaystackTransferListMeta;
}
