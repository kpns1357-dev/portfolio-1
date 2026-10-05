import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { getIncidentWithAccessCheck, requireRole } from "@/lib/authorize";
import { statusChangeSchema } from "@/lib/schemas/incident.schema";
import { withErrorHandler, AppError } from "@/lib/errors";

export const POST = withErrorHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await getSessionFromRequest(req);
    requireRole(user, ["AUTHORITY", "SUPER_ADMIN", "MODERATOR"]);

    // IDOR Check
    const incident = await getIncidentWithAccessCheck(user, params.id, "status");

    const body = await req.json();
    const { toStatus, reason } = statusChangeSchema.parse(body);

    const fromStatus = incident.status;

    const updatedIncident = await prisma.incident.update({
      where: { id: incident.id },
      data: {
        status: toStatus,
        resolvedAt:
          toStatus === "RESOLVED"
            ? new Date()
            : toStatus === "REOPENED"
            ? null
            : incident.resolvedAt,
      },
    });

    // Create status history record
    await prisma.statusHistory.create({
      data: {
        incidentId: incident.id,
        fromStatus,
        toStatus,
        actorId: user?.id,
        actorName: user?.name || "Authority Officer",
        actorRole: user?.role || "AUTHORITY",
        reason: reason || `Status transitioned from ${fromStatus} to ${toStatus}.`,
      },
    });

    // Log Audit Event
    await logAuditEvent({
      actor: user,
      action: "STATUS_CHANGED",
      entityType: "Incident",
      entityId: incident.id,
      previousState: { status: fromStatus },
      newState: { status: toStatus, reason },
    });

    // Notify all citizen reporters of this incident
    const citizenIds = Array.from(
      new Set(incident.reports.map((r: any) => r.citizenId).filter(Boolean))
    ) as string[];
    for (const citizenId of citizenIds) {
      let notifTitle = `Incident ${incident.caseId} Status Update: ${toStatus}`;
      let notifMsg = `Your reported case status has changed to ${toStatus}.`;

      if (toStatus === "VERIFICATION_PENDING") {
        notifTitle = "Resolution Verification Required";
        notifMsg = `The municipal authority has marked incident ${incident.caseId} as repaired. Please inspect and confirm whether the issue is resolved!`;
      } else if (toStatus === "RESOLVED") {
        notifTitle = "Incident Successfully Resolved";
        notifMsg = `Case ${incident.caseId} has been officially verified and closed. Thank you for contributing to your city!`;
      }

      await createNotification(
        citizenId,
        notifTitle,
        notifMsg,
        toStatus === "VERIFICATION_PENDING" ? "VERIFICATION_REQUEST" : "STATUS_CHANGE",
        `/incidents/${incident.caseId}`
      );
    }

    return NextResponse.json({
      success: true,
      incident: updatedIncident,
    });
  }
);
