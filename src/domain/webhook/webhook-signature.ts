export interface WebhookSignature {
  readonly provider: string;
  readonly rawBody: string;
  readonly signature: string;
  readonly headers: Readonly<Record<string, string>>;
}
