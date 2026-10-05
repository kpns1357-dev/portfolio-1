import { NextRequest, NextResponse } from "next/server";
import {
  revokeSession,
  verifyRefreshToken,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getSessionFromRequest,
} from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { withErrorHandler } from "@/lib/errors";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const user = await getSessionFromRequest(req);

  if (refreshToken) {
    const verified = await verifyRefreshToken(refreshToken);
    if (verified?.sessionId) {
      await revokeSession(verified.sessionId);
    }
  }

  if (user) {
    await logAuditEvent({
      actor: user,
      action: "USER_LOGGED_OUT",
      entityType: "User",
      entityId: user.id,
    });
  }

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully and session revoked.",
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
