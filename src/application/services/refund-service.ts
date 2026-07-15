import type { Result } from "../../shared/result/result.js";
import { err } from "../../shared/result/result.js";
import { InternalError } from "../../errors/internal-error.js";

export class RefundService {
  async create(
    _input: { paymentId: string; amount?: number; reason: string },
  ): Promise<Result<unknown, InternalError>> {
    return err(new InternalError("refund_not_implemented"));
  }

  async fetch(
    _id: string,
  ): Promise<Result<unknown, InternalError>> {
    return err(new InternalError("refund_not_implemented"));
  }
}
