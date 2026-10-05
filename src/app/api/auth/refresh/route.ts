import { NextRequest, NextResponse } from "next/server";
import {
  rotateRefreshToken,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE,
} from "@/lib/auth";
import { getClientIp, rateLimitRules } from "@/lib/ratelimit";
import { AppError, withErrorHandler } from "@/lib/errors";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  let refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    try {
      const body = await req.json();
      refreshToken = body.refreshToken;
    } catch {}
  }

  if (!refreshToken) {
    throw AppError.unauthorized("Refresh token is required.", "UNAUTHORIZED");
  }

  // Rate limiting by IP or token prefix
  await rateLimitRules.refresh(ip);

  // Rotate tokens (revokes old DB session, generates new session and tokens)
  const { accessToken, refreshToken: newRefreshToken } = await rotateRefreshToken(
    refreshToken,
    ip,
    userAgent
  );

  const response = NextResponse.json({
    success: true,
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

  response.cookies.set(REFRESH_TOKEN_COOKIE, newRefreshToken, {
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
