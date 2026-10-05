import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { withErrorHandler, AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await getSessionFromRequest(req);
  if (!user) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return NextResponse.json({ notifications, unreadCount });
});

export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const user = await getSessionFromRequest(req);
  if (!user) {
    throw AppError.unauthorized("Authentication required.");
  }

  const body = await req.json();
  const { notificationId, markAll = false } = body;

  if (markAll) {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({
      success: true,
      message: "All notifications marked as read.",
    });
  }

  if (notificationId && typeof notificationId === "string") {
    // Prevent IDOR by ensuring notification belongs to the calling user
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId: user.id },
      data: { isRead: true },
    });

    if (result.count === 0) {
      throw AppError.notFound("Notification not found or access denied.");
    }

    return NextResponse.json({ success: true });
  }

  throw AppError.badRequest("Invalid parameters provided.");
});
