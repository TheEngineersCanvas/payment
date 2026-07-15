export interface PaystackInitializeRequest {
  readonly amount: number;
  readonly email: string;
  readonly reference: string;
  readonly currency?: string;
  readonly callback_url?: string;
  readonly channels?: ReadonlyArray<string>;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface PaystackInitializeResponse {
  readonly status: boolean;
  readonly message: string;
  readonly data: PaystackInitializeData;
}

export interface PaystackInitializeData {
  readonly authorization_url: string;
  readonly access_code: string;
  readonly reference: string;
}

export interface PaystackVerifyResponse {
  readonly status: boolean;
  readonly message: string;
  readonly data: PaystackTransactionData;
}

export interface PaystackListResponse {
  readonly status: boolean;
  readonly message: string;
  readonly data: ReadonlyArray<PaystackTransactionData>;
  readonly meta: PaystackListMeta;
}

export interface PaystackListMeta {
  readonly total: number;
  readonly skipped: number;
  readonly perPage: number;
  readonly page: number;
  readonly pageCount: number;
}

export interface PaystackTransactionData {
  readonly id: number;
  readonly domain: string;
  readonly status: string;
  readonly reference: string;
  readonly amount: number;
  readonly currency: string;
  readonly channel: string;
  readonly gateway_response: string;
  readonly metadata: Readonly<Record<string, string | number | boolean>> | null;
  readonly paid_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly authorization: PaystackAuthorization | null;
  readonly customer: PaystackCustomer;
  readonly log: PaystackLog | null;
  readonly fees: number | null;
  readonly fees_split: Readonly<Record<string, unknown>> | null;
}

export interface PaystackAuthorization {
  readonly authorization_code: string;
  readonly bin: string;
  readonly last4: string;
  readonly bank: string;
  readonly channel: string;
  readonly country_code: string;
  readonly brand: string;
  readonly account_name?: string;
}

export interface PaystackCustomer {
  readonly id: number;
  readonly email: string;
  readonly phone?: string;
  readonly first_name?: string;
  readonly last_name?: string;
  readonly customer_code: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface PaystackLog {
  readonly start_time: number;
  readonly time_spent: number;
  readonly attempts: number;
  readonly errors: number;
}

export interface PaystackWebhookEvent {
  readonly event: string;
  readonly data: PaystackTransactionData;
}

export interface PaystackRefundResponse {
  readonly status: boolean;
  readonly message: string;
  readonly data: PaystackRefundData;
}

export interface PaystackRefundData {
  readonly id: number;
  readonly transaction: PaystackTransactionData;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
  readonly merchant_note: string;
  readonly customer_note: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
