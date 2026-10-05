import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/env";
import { AppError } from "./errors";
import { logSecurityViolation } from "./logger";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
}

// In-Memory Sliding Window Implementation (for dev / test / fallback)
interface MemoryRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, MemoryRecord>();

// Cleanup stale memory entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < 3600000);
    if (record.timestamps.length === 0) {
      memoryStore.delete(key);
    }
  }
}, 60000).unref();

function memoryRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const cutoff = now - windowMs;

  let record = memoryStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(key, record);
  }

  // Remove timestamps outside window
  record.timestamps = record.timestamps.filter((ts) => ts > cutoff);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetTime = Math.ceil((oldest + windowMs) / 1000);
    return {
      success: false,
      limit,
      remaining: 0,
      reset: resetTime,
    };
  }

  record.timestamps.push(now);
  const resetTime = Math.ceil((now + windowMs) / 1000);

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - record.timestamps.length),
    reset: resetTime,
  };
}

let redisInstance: Redis | null = null;
if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redisInstance = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (err) {
    console.warn("Failed to initialize Upstash Redis, defaulting to in-memory store:", err);
  }
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (redisInstance) {
    try {
      const upstashLimiter = new Ratelimit({
        redis: redisInstance,
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        prefix: "civicos_rl",
      });
      const result = await upstashLimiter.limit(key);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: Math.ceil(result.reset / 1000),
      };
    } catch (err) {
      console.warn("Upstash rate limit call failed, falling back to in-memory:", err);
    }
  }

  return memoryRateLimit(key, limit, windowSeconds);
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  actionName = "Request"
) {
  const res = await checkRateLimit(key, limit, windowSeconds);
  if (!res.success) {
    const retryAfter = Math.max(1, res.reset - Math.floor(Date.now() / 1000));
    logSecurityViolation({
      type: "RATE_LIMIT_EXCEEDED",
      ip: key,
      endpoint: actionName,
      details: { limit, windowSeconds, retryAfter },
    });
    throw AppError.rateLimited(
      `Rate limit exceeded for ${actionName}. Please retry after ${retryAfter} seconds.`,
      retryAfter
    );
  }
  return res;
}

export function withRateLimit(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>,
  config: {
    limit: number;
    windowSeconds: number;
    keyPrefix: string;
    identifierFn?: (req: NextRequest) => string;
  }
) {
  return async (req: NextRequest, ...args: any[]) => {
    const id = config.identifierFn ? config.identifierFn(req) : getClientIp(req);
    const key = `${config.keyPrefix}:${id}`;
    const result = await checkRateLimit(key, config.limit, config.windowSeconds);

    if (!result.success) {
      const retryAfter = Math.max(1, result.reset - Math.floor(Date.now() / 1000));
      logSecurityViolation({
        type: "RATE_LIMIT_EXCEEDED",
        ip: id,
        endpoint: req.nextUrl?.pathname || config.keyPrefix,
        details: { limit: config.limit, windowSeconds: config.windowSeconds, retryAfter },
      });

      const response = NextResponse.json(
        {
          error: "Too many requests. Please slow down and try again later.",
          code: "RATE_LIMITED",
          retryAfter,
        },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(retryAfter));
      response.headers.set("X-RateLimit-Limit", String(result.limit));
      response.headers.set("X-RateLimit-Remaining", "0");
      response.headers.set("X-RateLimit-Reset", String(result.reset));
      return response;
    }

    const response = await handler(req, ...args);
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.reset));
    return response;
  };
}

// Preset helpers
export const rateLimitRules = {
  login: (ip: string) => enforceRateLimit(`auth_login:${ip}`, 5, 900, "Login"), // 5 per 15 min per IP
  register: (ip: string) => enforceRateLimit(`auth_reg:${ip}`, 3, 3600, "Register"), // 3 per hour per IP
  refresh: (userId: string) => enforceRateLimit(`auth_ref:${userId}`, 20, 3600, "Token Refresh"),
  createIncident: (userId: string) => enforceRateLimit(`inc_create:${userId}`, 20, 3600, "Incident Submission"),
  comments: (userId: string) => enforceRateLimit(`comm_post:${userId}`, 30, 3600, "Comments"),
  evidence: (userId: string) => enforceRateLimit(`evid_post:${userId}`, 10, 3600, "Evidence Upload"),
  duplicateCheck: (userId: string) => enforceRateLimit(`dup_check:${userId}`, 30, 3600, "Duplicate Check"),
  duplicateMerge: (userId: string) => enforceRateLimit(`dup_merge:${userId}`, 10, 3600, "Duplicate Merge"),
  aiUser: (userId: string) => enforceRateLimit(`ai_user:${userId}`, 10, 60, "AI Query"),
  aiGlobal: () => enforceRateLimit("ai_global:instance", 500, 60, "Global AI"),
};
