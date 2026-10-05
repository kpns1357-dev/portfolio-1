import { env } from "@/env";

export interface LogContext {
  userId?: string | null;
  role?: string | null;
  route?: string | null;
  requestId?: string | null;
  ip?: string | null;
  [key: string]: unknown;
}

export const logger = {
  info(message: string, context?: LogContext) {
    const payload = {
      level: "info",
      timestamp: new Date().toISOString(),
      message,
      ...context,
    };
    console.log(JSON.stringify(payload));
  },

  warn(message: string, context?: LogContext) {
    const payload = {
      level: "warn",
      timestamp: new Date().toISOString(),
      message,
      ...context,
    };
    console.warn(JSON.stringify(payload));
  },

  error(message: string, error?: unknown, context?: LogContext) {
    const payload = {
      level: "error",
      timestamp: new Date().toISOString(),
      message,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: env.NODE_ENV !== "production" ? error.stack : undefined,
            }
          : error,
      ...context,
    };
    console.error(JSON.stringify(payload));
  },

  security(
    event: string,
    context: LogContext & {
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      action: string;
    }
  ) {
    const payload = {
      level: "security",
      timestamp: new Date().toISOString(),
      event,
      ...context,
    };
    console.warn(JSON.stringify(payload));
  },
};

export function logSecurityViolation(details: {
  type: string;
  userId?: string | null;
  ip?: string | null;
  endpoint?: string | null;
  details?: Record<string, unknown>;
}) {
  logger.security(details.type, {
    severity: "HIGH",
    action: details.type,
    userId: details.userId,
    ip: details.ip,
    route: details.endpoint,
    ...details.details,
  });
}
