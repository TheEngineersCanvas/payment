export interface WebhookVerifier {
  verify(rawBody: string | Buffer, signature: string): boolean;
}
