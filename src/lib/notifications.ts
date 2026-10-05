import { prisma } from "./prisma";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "INFO" | "ASSIGNMENT" | "VERIFICATION_REQUEST" | "STATUS_CHANGE" | "SLA_ALERT" = "INFO",
  link?: string
) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link,
      },
    });
  } catch (err) {
    console.error("[Notification] Failed to create notification:", err);
  }
}
