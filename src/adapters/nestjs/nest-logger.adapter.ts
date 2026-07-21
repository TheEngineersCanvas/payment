import { Logger as NestLogger } from "@nestjs/common";
import type { Logger } from "../../public-api/index.js";

type LogContext = Record<string, string | number | boolean | undefined>;

/**
 * Bridges NestJS's `Logger` to the `@tec/payment` SDK's {@link Logger} interface.
 *
 * Pass an instance to the `logger` field of {@link PaymentClientConfig} to
 * route all SDK log output through Nest's structured logger.
 *
 * @example
 * ```ts
 * import { NestLoggerAdapter } from "@tec/payment/nestjs";
 *
 * PaymentModule.forRoot({
 *   providers: { paystack: { secretKey: "sk_..." } },
 *   logger: new NestLoggerAdapter("PaymentClient"),
 * });
 * ```
 */
export class NestLoggerAdapter implements Logger {
  private readonly logger: NestLogger;

  constructor(context?: string) {
    this.logger = new NestLogger(context ?? "PaymentClient");
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(context ? `${message} ${JSON.stringify(context)}` : message);
  }

  info(message: string, context?: LogContext): void {
    this.logger.log(context ? `${message} ${JSON.stringify(context)}` : message);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(context ? `${message} ${JSON.stringify(context)}` : message);
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    this.logger.error(
      context ? `${message} ${JSON.stringify(context)}` : message,
      error instanceof Error ? error.stack : undefined,
      "PaymentClient",
    );
  }

  child(bindings: LogContext): Logger {
    const childContext = Object.entries(bindings)
      .map(([k, v]) => `${k}:${v}`)
      .join(",");
    return new NestLoggerAdapter(childContext || "PaymentClient");
  }
}
