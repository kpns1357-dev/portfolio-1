import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { env } from "@/env";

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "INTERNAL_SERVER_ERROR"
  | "ACCOUNT_LOCKED"
  | "TOKEN_EXPIRED"
  | "SESSION_REVOKED"
  | "CSRF_VIOLATION"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, "BAD_REQUEST", message, details);
  }

  static unauthorized(message: string = "Authentication required.", code: ErrorCode = "UNAUTHORIZED") {
    return new AppError(401, code, message);
  }

  static forbidden(message: string = "Access denied. Insufficient permissions.") {
    return new AppError(403, "FORBIDDEN", message);
  }

  static notFound(message: string = "Resource not found.") {
    return new AppError(404, "NOT_FOUND", message);
  }

  static conflict(message: string) {
    return new AppError(409, "CONFLICT", message);
  }

  static rateLimited(message: string = "Too many requests. Please try again later.", retryAfterSeconds?: number) {
    return new AppError(429, "RATE_LIMITED", message, { retryAfter: retryAfterSeconds });
  }

  static locked(message: string = "Account temporarily locked due to repeated failed login attempts.") {
    return new AppError(423, "ACCOUNT_LOCKED", message);
  }

  static internal(message: string = "An unexpected error occurred.") {
    return new AppError(500, "INTERNAL_SERVER_ERROR", message);
  }
}

export function handleRouteError(error: unknown) {
  if (error instanceof AppError) {
    const res = NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {}),
      },
      { status: error.statusCode }
    );
    if (error.code === "RATE_LIMITED" && (error.details as any)?.retryAfter) {
      res.headers.set("Retry-After", String((error.details as any).retryAfter));
    }
    return res;
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        code: "VALIDATION_ERROR",
        errors: error.flatten(),
      },
      { status: 400 }
    );
  }

  console.error("Unhandled API Error:", error);

  return NextResponse.json(
    {
      error: "An unexpected internal server error occurred.",
      code: "INTERNAL_SERVER_ERROR",
      ...(env.NODE_ENV !== "production" && error instanceof Error ? { debug: error.message } : {}),
    },
    { status: 500 }
  );
}

export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(handler: T): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (err) {
      return handleRouteError(err);
    }
  }) as T;
}
