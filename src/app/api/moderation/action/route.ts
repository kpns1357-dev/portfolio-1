import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { requireRole } from "@/lib/authorize";
import { withErrorHandler, AppError } from "@/lib/errors";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await getSessionFromRequest(req);
  requireRole(user, ["MODERATOR", "SUPER_ADMIN"]);

  const body = await req.json();
  const { action, reportId, incidentId, reason, flagType } = body;

  if (!action) {
    throw AppError.badRequest("Action parameter is required.");
  }

  if (action === "APPROVE" && incidentId) {
    const inc = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: { reports: true },
    });

    if (!inc) {
      throw AppError.notFound("Incident not found.");
    }

    const updated = await prisma.incident.update({
      where: { id: incidentId },
      data: { status: "VERIFIED" },
    });

    await prisma.statusHistory.create({
      data: {
        incidentId: inc.id,
        fromStatus: inc.status,
        toStatus: "VERIFIED",
        actorId: user?.id,
        actorName: user?.name || "Moderator",
        actorRole: user?.role || "MODERATOR",
        reason: reason || "Moderator verified authentic civic problem.",
      },
    });

    await logAuditEvent({
      actor: user,
      action: "INCIDENT_VERIFIED",
      entityType: "Incident",
      entityId: inc.id,
      newState: { status: "VERIFIED", verifiedBy: user?.name },
    });

    // Reward reporter reliability
    for (const r of inc.reports) {
      if (r.citizenId) {
        await prisma.user
          .update({
            where: { id: r.citizenId },
            data: { reliabilityScore: { increment: 0.02 } },
          })
          .catch(() => {});

        await createNotification(
          r.citizenId,
          "Report Verified by Moderator",
          `Your report for case ${inc.caseId} was verified and queued for authority team dispatch.`,
          "STATUS_CHANGE",
          `/incidents/${inc.caseId}`
        );
      }
    }

    return NextResponse.json({ success: true, incident: updated });
  } else if (action === "REJECT") {
    if (incidentId) {
      const inc = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: { reports: true },
      });

      if (inc) {
        await prisma.incident.update({
          where: { id: incidentId },
          data: { status: "REJECTED" },
        });

        await prisma.statusHistory.create({
          data: {
            incidentId: inc.id,
            fromStatus: inc.status,
            toStatus: "REJECTED",
            actorId: user?.id,
            actorName: user?.name || "Moderator",
            actorRole: user?.role || "MODERATOR",
            reason: reason || "Rejected by moderation panel.",
          },
        });

        // Penalize reliability slightly if abusive or invalid
        for (const r of inc.reports) {
          if (r.citizenId) {
            await prisma.user
              .update({
                where: { id: r.citizenId },
                data: { reliabilityScore: { decrement: 0.05 } },
              })
              .catch(() => {});
          }
        }
      }
    }

    if (reportId) {
      await prisma.report.update({
        where: { id: reportId },
        data: { moderationFlag: "REJECTED", moderationNotes: reason },
      });
    }

    await logAuditEvent({
      actor: user,
      action: "INCIDENT_REJECTED",
      entityType: "Incident",
      entityId: incidentId || reportId || "",
      newState: { reason },
    });

    return NextResponse.json({ success: true, message: "Rejected successfully" });
  } else if (action === "FLAG" && reportId) {
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        moderationFlag: flagType || "SPAM",
        moderationNotes: reason,
      },
    });

    await logAuditEvent({
      actor: user,
      action: "REPORT_FLAGGED",
      entityType: "Report",
      entityId: reportId,
      newState: { flag: flagType, reason },
    });

    return NextResponse.json({ success: true, report: updatedReport });
  }

  throw AppError.badRequest("Invalid action or target parameters.");
});
