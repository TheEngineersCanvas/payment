import type { Result } from "../../shared/result/result.js";
import { err } from "../../shared/result/result.js";
import { InternalError } from "../../errors/internal-error.js";

export interface WebhookInput {
  readonly provider: string;
  readonly rawBody: string;
  readonly signature: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export class WebhookService {
  async receive(
    _input: WebhookInput,
  ): Promise<Result<unknown, InternalError>> {
    return err(new InternalError("webhook_not_implemented"));
  }
}
