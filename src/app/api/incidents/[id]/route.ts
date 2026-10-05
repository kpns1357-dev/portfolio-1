import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateSla } from "@/lib/sla";
import { getSessionFromRequest } from "@/lib/auth";
import { getIncidentWithAccessCheck, isSuperOrAdmin } from "@/lib/authorize";
import { updateIncidentSchema } from "@/lib/schemas/incident.schema";
import { withErrorHandler, AppError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await getSessionFromRequest(req);
    const identifier = params.id;

    // Zero-IDOR Permission & Existence check
    await getIncidentWithAccessCheck(user, identifier, "read");

    const incident = await prisma.incident.findFirst({
      where: {
        OR: [{ id: identifier }, { caseId: identifier }],
      },
      include: {
        category: true,
        department: true,
        team: true,
        recurringCluster: true,
        priorityBreakdown: true,
        assignments: {
          include: { team: true, department: true },
          orderBy: { assignedAt: "desc" },
        },
        statusHistory: {
          include: { actor: { select: { name: true, role: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
        evidence: {
          orderBy: { createdAt: "asc" },
        },
        reports: {
          include: {
            category: true,
            aiAnalysis: true,
            evidence: true,
            citizen: {
              select: { id: true, name: true, role: true, reliabilityScore: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        verifications: {
          include: {
            citizen: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        comments: {
          orderBy: { createdAt: "asc" },
        },
        escalations: {
          orderBy: { triggeredAt: "desc" },
        },
      },
    });

    if (!incident) {
      throw AppError.notFound("Incident not found.");
    }

    // Filter out internal comments for citizens
    const isAuthorityOrAdmin =
      user && (isSuperOrAdmin(user) || user.role === "AUTHORITY" || user.role === "MODERATOR");

    const sanitizedComments = isAuthorityOrAdmin
      ? incident.comments
      : incident.comments.filter((c) => !c.isInternal);

    // Redact anonymous citizen identities
    const sanitizedReports = incident.reports.map((r) => {
      if (r.anonymity === "ANONYMOUS" && !isAuthorityOrAdmin) {
        return {
          ...r,
          citizen: null,
          citizenId: null,
        };
      }
      return r;
    });

    const slaInfo = evaluateSla(incident.slaDeadline);

    return NextResponse.json({
      incident: {
        ...incident,
        comments: sanitizedComments,
        reports: sanitizedReports,
        slaInfo,
      },
    });
  }
);

export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await getSessionFromRequest(req);
    const identifier = params.id;

    // Verify write permissions
    const existing = await getIncidentWithAccessCheck(user, identifier, "write");

    const body = await req.json();
    const validated = updateIncidentSchema.parse(body);

    const updateData: any = {};
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.categoryId !== undefined) updateData.categoryId = validated.categoryId;
    if (validated.departmentId !== undefined) updateData.departmentId = validated.departmentId;
    if (validated.priorityLabel !== undefined) updateData.priorityLabel = validated.priorityLabel;
    if (validated.priorityScore !== undefined) updateData.priorityScore = validated.priorityScore;

    const updated = await prisma.incident.update({
      where: { id: existing.id },
      data: updateData,
    });

    await logAuditEvent({
      actor: user,
      action: "INCIDENT_UPDATED",
      entityType: "Incident",
      entityId: existing.id,
      previousState: existing,
      newState: updated,
    });

    return NextResponse.json({
      success: true,
      incident: updated,
    });
  }
);
