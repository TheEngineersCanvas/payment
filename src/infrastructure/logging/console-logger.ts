import type { Logger, LogContext } from "../../application/ports/logger.js";

const SENSITIVE_RE = /(secret|authorization|password|signature|api[_-]?key|card|pan|cvv)/i;

const REPLACEMENT = "[REDACTED]";

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (SENSITIVE_RE.test(key)) {
      result[key] = REPLACEMENT;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = redact(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function formatJson(entry: Record<string, unknown>): string {
  try {
    return JSON.stringify(redact(entry));
  } catch {
    return JSON.stringify({ message: "log serialization error" });
  }
}

export class ConsoleLogger implements Logger {
  private readonly bindings: LogContext;

  constructor(bindings: LogContext = {}) {
    this.bindings = bindings;
  }

  debug(message: string, context?: LogContext): void {
    console.log(formatJson({ level: "debug", message, ...this.bindings, ...context }));
  }

  info(message: string, context?: LogContext): void {
    console.log(formatJson({ level: "info", message, ...this.bindings, ...context }));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(formatJson({ level: "warn", message, ...this.bindings, ...context }));
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    const errObj: Record<string, unknown> = { level: "error", message, ...this.bindings, ...context };
    if (error instanceof Error) {
      errObj.error = { name: error.name, message: error.message };
    } else if (error !== undefined) {
      errObj.error = String(error);
    }
    console.error(formatJson(errObj));
  }

  child(bindings: LogContext): Logger {
    return new ConsoleLogger({ ...this.bindings, ...bindings });
  }
}
