export interface WebhookVerifier {
  verify(rawBody: string, signature: string): boolean;
}
