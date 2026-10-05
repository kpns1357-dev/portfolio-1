import { prisma } from "./prisma";
import { SessionUser } from "./types";
import { logger } from "./logger";

export interface LogAuditInput {
  actor?: SessionUser | null;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export async function logAuditEvent(input: LogAuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actor?.id || null,
        actorName: input.actor?.name || "System",
        actorRole: input.actor?.role || "SYSTEM",
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        previousState: input.previousState ? JSON.stringify(input.previousState) : null,
        newState: input.newState ? JSON.stringify(input.newState) : null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        requestId: input.requestId || null,
      },
    });

    logger.security(`[Audit] ${input.action} on ${input.entityType}:${input.entityId}`, {
      userId: input.actor?.id,
      role: input.actor?.role,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ip: input.ipAddress,
      requestId: input.requestId,
      severity: input.action.includes("FAILED") || input.action.includes("LOCKOUT") ? "HIGH" : "LOW",
    });
  } catch (err) {
    console.error("[AuditLog] Failed to log audit event:", err);
  }
}
