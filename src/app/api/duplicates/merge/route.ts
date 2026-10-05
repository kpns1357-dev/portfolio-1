import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { calculatePriorityScore, getPriorityLabel } from "@/lib/priority";
import { logAuditEvent } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { requireRole } from "@/lib/authorize";
import { rateLimitRules } from "@/lib/ratelimit";
import { duplicateMergeSchema } from "@/lib/schemas/moderation.schema";
import { withErrorHandler, AppError } from "@/lib/errors";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await getSessionFromRequest(req);
  requireRole(user, ["MODERATOR", "SUPER_ADMIN"]);

  // Rate Limiting: 10 merges per hour per moderator
  await rateLimitRules.duplicateMerge(user!.id);

  const body = await req.json();
  const { sourceIncidentId, targetIncidentId, notes } = duplicateMergeSchema.parse(body);

  if (sourceIncidentId === targetIncidentId) {
    throw AppError.badRequest("Cannot merge an incident into itself.");
  }

  const sourceIncident = await prisma.incident.findUnique({
    where: { id: sourceIncidentId },
    include: { reports: true, evidence: true },
  });

  if (!sourceIncident) {
    throw AppError.notFound("Source incident not found.");
  }

  const targetIncident = await prisma.incident.findUnique({
    where: { id: targetIncidentId },
    include: { reports: true, category: true },
  });

  if (!targetIncident) {
    throw AppError.notFound("Target incident not found.");
  }

  // 1. Link reports and evidence to target incident
  await prisma.$transaction(async (tx) => {
    // Re-link reports
    await tx.report.updateMany({
      where: { incidentId: sourceIncidentId },
      data: { incidentId: targetIncidentId },
    });

    // Re-link evidence
    await tx.evidence.updateMany({
      where: { incidentId: sourceIncidentId },
      data: { incidentId: targetIncidentId },
    });

    // Close source incident as duplicate
    await tx.incident.update({
      where: { id: sourceIncidentId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });

    // Record relationship
    await tx.incidentRelationship.create({
      data: {
        sourceIncidentId,
        targetIncidentId,
        relationshipType: "DUPLICATE",
        confidence: 1.0,
        notes: notes || `Merged into ${targetIncident.caseId}`,
      },
    });

    // Recalculate priority on target incident
    const totalReports = targetIncident.reports.length + sourceIncident.reports.length;
    const breakdown = calculatePriorityScore({
      severityScore: targetIncident.priorityScore / 10,
      safetyRisk: targetIncident.priorityLabel as any,
      reportsCount: totalReports,
      isRecurring: Boolean(targetIncident.recurringClusterId),
    });

    await tx.incident.update({
      where: { id: targetIncidentId },
      data: {
        priorityScore: breakdown.totalScore,
        priorityLabel: getPriorityLabel(breakdown.totalScore),
      },
    });

    // Status History
    await tx.statusHistory.create({
      data: {
        incidentId: targetIncidentId,
        fromStatus: targetIncident.status,
        toStatus: targetIncident.status,
        actorId: user!.id,
        actorName: user!.name || "Moderator",
        actorRole: user!.role,
        reason: `Merged duplicate case ${sourceIncident.caseId} into this incident. ${notes || ""}`.trim(),
      },
    });
  });

  // Audit Log
  await logAuditEvent({
    actor: user,
    action: "INCIDENT_MERGED",
    entityType: "Incident",
    entityId: targetIncident.id,
    newState: {
      sourceCaseId: sourceIncident.caseId,
      targetCaseId: targetIncident.caseId,
      notes,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Case ${sourceIncident.caseId} successfully merged into ${targetIncident.caseId}`,
  });
});
