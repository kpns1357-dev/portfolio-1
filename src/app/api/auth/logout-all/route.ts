import { NextRequest, NextResponse } from "next/server";
import {
  revokeAllUserSessions,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getSessionFromRequest,
} from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { AppError, withErrorHandler } from "@/lib/errors";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await getSessionFromRequest(req);
  if (!user) {
    throw AppError.unauthorized("Authentication required.");
  }

  await revokeAllUserSessions(user.id);

  await logAuditEvent({
    actor: user,
    action: "ALL_SESSIONS_REVOKED",
    entityType: "User",
    entityId: user.id,
  });

  const response = NextResponse.json({
    success: true,
    message: "All active sessions have been revoked.",
  });

  const clearCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
    sameSite: "strict" as const,
  };

  response.cookies.set(ACCESS_TOKEN_COOKIE, "", clearCookieOptions);
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", clearCookieOptions);
  response.cookies.set("civicos_token", "", { ...clearCookieOptions, sameSite: "lax" });

  return response;
});
