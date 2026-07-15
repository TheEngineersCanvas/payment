export type PaymentChannel =
  | "card"
  | "bank"
  | "ussd"
  | "qr"
  | "mobile_money"
  | "bank_transfer"
  | (string & {});
