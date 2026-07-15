import type { Logger, LogContext } from "../../application/ports/logger.js";

export class NoopLogger implements Logger {
  debug(_message: string, _context?: LogContext): void {}
  info(_message: string, _context?: LogContext): void {}
  warn(_message: string, _context?: LogContext): void {}
  error(_message: string, _error?: unknown, _context?: LogContext): void {}
  child(_bindings: LogContext): Logger {
    return this;
  }
}
