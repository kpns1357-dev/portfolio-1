import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  validatePasswordStrength,
  createDBSession,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getClientIp, rateLimitRules } from "@/lib/ratelimit";
import { registerSchema } from "@/lib/schemas/auth.schema";
import { AppError, withErrorHandler } from "@/lib/errors";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  // 1. Rate Limiting: 3 registrations per hour per IP
  await rateLimitRules.register(ip);

  // 2. Input validation
  const body = await req.json();
  const { name, email, password, phone, role } = registerSchema.parse(body);

  // 3. Password Strength Enforcement
  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    throw AppError.badRequest(strength.reason || "Password does not meet security requirements.");
  }

  // 4. Duplicate Check
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw AppError.conflict("An account with this email address already exists.");
  }

  // 5. Hash Password & Create User
  const passwordHash = await hashPassword(password);
  const assignedRole = role === "MODERATOR" || role === "AUTHORITY" ? role : "CITIZEN";

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      phone: phone || null,
      role: assignedRole,
      reliabilityScore: 1.0,
    },
  });

  const sessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as any,
    departmentId: user.departmentId,
    teamId: user.teamId,
    reliabilityScore: user.reliabilityScore,
  };

  // 6. Create Session
  const { accessToken, refreshToken } = await createDBSession(
    sessionUser,
    ip,
    userAgent
  );

  // 7. Audit log
  await logAuditEvent({
    actor: sessionUser,
    action: "USER_REGISTERED",
    entityType: "User",
    entityId: user.id,
    ipAddress: ip,
    userAgent,
    newState: { name: user.name, email: user.email, role: user.role },
  });

  const response = NextResponse.json({
    success: true,
    user: sessionUser,
    accessToken,
  });

  const isProd = process.env.NODE_ENV === "production";

  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    path: "/",
    maxAge: 15 * 60,
    sameSite: "strict",
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 3600,
    sameSite: "strict",
  });

  response.cookies.set("civicos_token", accessToken, {
    httpOnly: true,
    secure: isProd,
    path: "/",
    maxAge: 15 * 60,
    sameSite: "lax",
  });

  return response;
});
