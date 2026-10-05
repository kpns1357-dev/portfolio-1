import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { getIncidentWithAccessCheck, requireRole } from "@/lib/authorize";
import { assignIncidentSchema } from "@/lib/schemas/incident.schema";
import { withErrorHandler, AppError } from "@/lib/errors";

export const POST = withErrorHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await getSessionFromRequest(req);
    requireRole(user, ["AUTHORITY", "SUPER_ADMIN"]);

    // IDOR Check
    const incident = await getIncidentWithAccessCheck(user, params.id, "assign");

    const body = await req.json();
    const { teamId, departmentId, notes } = assignIncidentSchema.parse(body);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { department: true },
    });

    if (!team) {
      throw AppError.notFound("Team not found.");
    }

    // Deactivate previous assignments
    await prisma.assignment.updateMany({
      where: { incidentId: incident.id, active: true },
      data: { active: false },
    });

    // Create new assignment
    const assignment = await prisma.assignment.create({
      data: {
        incidentId: incident.id,
        teamId: team.id,
        departmentId: departmentId,
        assignedById: user!.id,
        notes: notes || "Team assigned by municipal operations supervisor.",
        active: true,
      },
    });

    // Increment team activeWorkload
    await prisma.team.update({
      where: { id: team.id },
      data: { activeWorkload: { increment: 1 } },
    });

    // Update incident status to ASSIGNED if currently in REPORTED/UNDER_REVIEW/VERIFIED
    const newStatus = ["REPORTED", "UNDER_REVIEW", "VERIFIED"].includes(incident.status)
      ? "ASSIGNED"
      : incident.status;

    await prisma.incident.update({
      where: { id: incident.id },
      data: {
        departmentId,
        teamId: team.id,
        status: newStatus,
      },
    });

    // Status History
    await prisma.statusHistory.create({
      data: {
        incidentId: incident.id,
        fromStatus: incident.status,
        toStatus: newStatus,
        actorId: user!.id,
        actorName: user!.name || "Authority Director",
        actorRole: user!.role || "AUTHORITY",
        reason: `Assigned to ${team.name} (${team.department.name}). ${notes || ""}`.trim(),
      },
    });

    // Audit Log
    await logAuditEvent({
      actor: user,
      action: "TEAM_ASSIGNED",
      entityType: "Incident",
      entityId: incident.id,
      newState: { teamName: team.name, departmentName: team.department.name, notes },
    });

    // Notify citizen reporters
    const citizenIds = Array.from(
      new Set(incident.reports.map((r: any) => r.citizenId).filter(Boolean))
    ) as string[];
    for (const citizenId of citizenIds) {
      await createNotification(
        citizenId,
        "Field Team Assigned to Your Case",
        `Municipal team "${team.name}" has been assigned to resolve ${incident.caseId}.`,
        "ASSIGNMENT",
        `/incidents/${incident.caseId}`
      );
    }

    return NextResponse.json({
      success: true,
      assignment,
      team,
      incidentStatus: newStatus,
    });
  }
);
