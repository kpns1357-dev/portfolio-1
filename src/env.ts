import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("3000"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long for cryptographically secure signing."),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters long for secure refresh token signing."),
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://127.0.0.1:3000"),
  DATABASE_URL: z.string().default("file:./civicos.db"),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

function getRawEnv() {
  const defaultJwtSecret = "civicos_development_super_secure_jwt_access_secret_2026_key_!@#$";
  const defaultRefreshSecret = "civicos_development_super_secure_jwt_refresh_secret_2026_key_!@#$";

  return {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT || "3000",
    JWT_SECRET: process.env.JWT_SECRET || defaultJwtSecret,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || defaultRefreshSecret,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000",
    DATABASE_URL: process.env.DATABASE_URL || "file:./civicos.db",
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

const parsedEnv = envSchema.safeParse(getRawEnv());

if (!parsedEnv.success) {
  console.error("❌ CRITICAL: Invalid environment configuration:", parsedEnv.error.format());
  throw new Error("Invalid environment configuration. Check your environment variables.");
}

export const env = {
  ...parsedEnv.data,
  allowedOriginsArray: parsedEnv.data.ALLOWED_ORIGINS.split(",").map((o) => o.trim().toLowerCase()),
};
