import bcrypt from "bcryptjs";
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { SessionUser, UserRole } from "./types";
import { prisma } from "./prisma";
import { env } from "@/env";
import { AppError } from "./errors";

export const ACCESS_TOKEN_COOKIE = "auth_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

const ACCESS_SECRET_KEY = new TextEncoder().encode(env.JWT_SECRET);
const REFRESH_SECRET_KEY = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

const COMMON_PASSWORDS = new Set([
  "password1234",
  "123456789012",
  "adminadmin12",
  "welcome1234!",
  "qwertyuiop12",
  "letmein1234!",
]);

export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (password.length < 12) {
    return { valid: false, reason: "Password must be at least 12 characters long." };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, reason: "Password is too common and easily guessed." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: "Password must include at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: "Password must include at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Password must include at least one digit." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, reason: "Password must include at least one special character." };
  }
  return { valid: true };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Access Token: 15 minutes TTL
export async function signAccessToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    departmentId: user.departmentId || null,
    teamId: user.teamId || null,
    reliabilityScore: user.reliabilityScore,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(ACCESS_SECRET_KEY);
}

// Refresh Token: 7 days TTL
export async function signRefreshToken(user: SessionUser, sessionId: string): Promise<string> {
  return new SignJWT({
    sub: user.id,
    sid: sessionId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(REFRESH_SECRET_KEY);
}

export async function verifyAccessToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET_KEY);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as UserRole,
      departmentId: (payload.departmentId as string) || null,
      teamId: (payload.teamId as string) || null,
      reliabilityScore: (payload.reliabilityScore as number) ?? 1.0,
    };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string; sessionId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET_KEY);
    if (!payload.sub || !payload.sid) return null;
    return {
      userId: payload.sub as string,
      sessionId: payload.sid as string,
    };
  } catch {
    return null;
  }
}

// Session Creation with DB Record
export async function createDBSession(user: SessionUser, ip?: string, userAgent?: string) {
  const sessionId = crypto.randomUUID();
  const refreshToken = await signRefreshToken(user, sessionId);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      tokenHash,
      ip: ip || null,
      userAgent: userAgent || null,
      expiresAt,
    },
  });

  const accessToken = await signAccessToken(user);

  return { accessToken, refreshToken, expiresAt };
}

// Refresh Token Rotation
export async function rotateRefreshToken(token: string, ip?: string, userAgent?: string) {
  const verified = await verifyRefreshToken(token);
  if (!verified) {
    throw AppError.unauthorized("Invalid or expired refresh token.", "TOKEN_EXPIRED");
  }

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.revokedAt || new Date() > session.expiresAt) {
    if (session && !session.revokedAt) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
    }
    throw AppError.unauthorized("Session revoked or expired.", "SESSION_REVOKED");
  }

  // Revoke old session and issue new session (rotation)
  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  const sessionUser: SessionUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as UserRole,
    departmentId: session.user.departmentId,
    teamId: session.user.teamId,
    reliabilityScore: session.user.reliabilityScore,
  };

  return createDBSession(sessionUser, ip, userAgent);
}

// Revoke a single session
export async function revokeSession(sessionId: string) {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Revoke all sessions for a user
export async function revokeAllUserSessions(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Failed login tracker
export async function handleFailedLogin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const attempts = user.failedLoginAttempts + 1;
  const data: any = { failedLoginAttempts: attempts };

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    data.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
  }

  await prisma.user.update({
    where: { id: userId },
    data,
  });
}

export async function resetFailedLoginAttempts(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
}

export const signToken = signAccessToken;

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value || cookieStore.get("civicos_token")?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  // If middleware verified and injected headers
  const headerUserId = req.headers.get("x-user-id");
  if (headerUserId) {
    return {
      id: headerUserId,
      email: req.headers.get("x-user-email") || "",
      name: "",
      role: (req.headers.get("x-user-role") as UserRole) || "CITIZEN",
      departmentId: req.headers.get("x-user-department-id") || null,
      teamId: req.headers.get("x-user-team-id") || null,
      reliabilityScore: 1.0,
    };
  }

  const tokenCookie =
    req.cookies.get(ACCESS_TOKEN_COOKIE)?.value ||
    req.cookies.get("civicos_token")?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const token = tokenCookie || bearerToken;
  if (!token) return null;
  return verifyAccessToken(token);
}

export function requireRole(user: SessionUser | null, allowedRoles: UserRole[]): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN" || (user.role as string) === "ADMIN") return true;
  return allowedRoles.includes(user.role);
}

