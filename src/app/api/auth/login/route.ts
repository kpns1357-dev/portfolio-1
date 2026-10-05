import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  comparePassword,
  createDBSession,
  handleFailedLogin,
  resetFailedLoginAttempts,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getClientIp, rateLimitRules } from "@/lib/ratelimit";
import { loginSchema } from "@/lib/schemas/auth.schema";
import { AppError, withErrorHandler } from "@/lib/errors";
import { logSecurityViolation } from "@/lib/logger";

const DUMMY_HASH = "$2a$12$e80y9m6uYlY8y9e80y9m6uYlY8y9e80y9m6uYlY8y9e80y9m6uYlY8";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  // 1. Rate Limiting: 5 attempts per 15 min per IP
  await rateLimitRules.login(ip);

  // 2. Input validation
  const body = await req.json();
  const { email, password } = loginSchema.parse(body);

  // 3. User lookup
  const user = await prisma.user.findUnique({
    where: { email },
    include: { department: true, team: true },
  });

  // 4. Lockout check
  if (user && user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    logSecurityViolation({
      type: "ACCOUNT_LOCKED",
      userId: user.id,
      ip,
      endpoint: "/api/auth/login",
      details: { lockedUntil: user.lockedUntil, minutesLeft },
    });
    throw AppError.locked(
      `Account is locked due to repeated failed login attempts. Try again in ${minutesLeft} minute(s).`
    );
  }

  // 5. Timing-attack resistant password verification
  const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
  const isMatch = await comparePassword(password, hashToCompare);

  if (!user || !isMatch) {
    if (user) {
      await handleFailedLogin(user.id);
    }
    logSecurityViolation({
      type: "AUTH_FAILURE",
      ip,
      endpoint: "/api/auth/login",
      details: { email },
    });
    throw AppError.unauthorized("Invalid email or password.");
  }

  // 6. Reset failed attempts upon successful authentication
  await resetFailedLoginAttempts(user.id);

  const sessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as any,
    departmentId: user.departmentId,
    teamId: user.teamId,
    departmentName: user.department?.name,
    teamName: user.team?.name,
    reliabilityScore: user.reliabilityScore,
  };

  // 7. Create DB Session and Tokens
  const { accessToken, refreshToken, expiresAt } = await createDBSession(
    sessionUser,
    ip,
    userAgent
  );

  // 8. Audit log
  await logAuditEvent({
    actor: sessionUser,
    action: "USER_LOGGED_IN",
    entityType: "User",
    entityId: user.id,
    ipAddress: ip,
    userAgent,
  });

  const response = NextResponse.json({
    success: true,
    user: sessionUser,
    accessToken,
  });

  const isProd = process.env.NODE_ENV === "production";

  // Access Token: 15 minutes, httpOnly, Secure, SameSite=Strict
  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    path: "/",
    maxAge: 15 * 60, // 15 mins
    sameSite: "strict",
  });

  // Refresh Token: 7 days, httpOnly, Secure, SameSite=Strict
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 3600, // 7 days
    sameSite: "strict",
  });

  // Backward compatibility cookie for existing client components
  response.cookies.set("civicos_token", accessToken, {
    httpOnly: true,
    secure: isProd,
    path: "/",
    maxAge: 15 * 60,
    sameSite: "lax",
  });

  return response;
});
