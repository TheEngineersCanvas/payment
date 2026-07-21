/**
 * Shape of an Express/Fastify request after `rawBody: true` is set on
 * `NestFactory.create()`.  Consumers *must* enable this option or the
 * built-in {@link WebhookController} will receive an empty body and
 * every webhook will be rejected.
 *
 * @see {@link WebhookController}
 */
export interface RawBodyRequest {
  readonly rawBody?: string | Buffer;
  readonly headers?: Record<string, string | readonly string[] | undefined>;
}
