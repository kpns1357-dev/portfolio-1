import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { aiService } from "@/services/ai/aiService";
import { logAuditEvent } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { getIncidentWithAccessCheck } from "@/lib/authorize";
import { rateLimitRules } from "@/lib/ratelimit";
import { uploadEvidenceSchema } from "@/lib/schemas/evidence.schema";
import { withErrorHandler, AppError } from "@/lib/errors";

export const POST = withErrorHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await getSessionFromRequest(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required to upload evidence.");
    }

    // Rate Limiting: 10 per hour per user
    await rateLimitRules.evidence(user.id);

    // IDOR Access Check (Owner or Assigned Authority/Admin)
    const incident = await getIncidentWithAccessCheck(user, params.id, "write");

    const fullIncident = await prisma.incident.findUnique({
      where: { id: incident.id },
      include: {
        evidence: true,
        category: true,
        reports: true,
      },
    });

    if (!fullIncident) {
      throw AppError.notFound("Incident not found.");
    }

    const body = await req.json();
    const { url, evidenceType, notes, filename } = uploadEvidenceSchema.parse(body);

    // 1. Create Evidence record
    const evidence = await prisma.evidence.create({
      data: {
        incidentId: fullIncident.id,
        evidenceType,
        url,
        filename: filename || "evidence.jpg",
        mimeType: "image/jpeg",
        notes: notes || `${evidenceType} evidence submitted`,
        uploaderId: user.id,
      },
    });

    let comparison = null;

    // 2. If REPAIR evidence is uploaded, run AI comparison against original citizen evidence
    if (evidenceType === "REPAIR") {
      const beforeEvidence = fullIncident.evidence.filter((e) => e.evidenceType === "CITIZEN_SUBMISSION");
      const beforeUrls = beforeEvidence.map((e) => e.url);

      comparison = await aiService.compareEvidence({
        beforeImages: beforeUrls.length > 0 ? beforeUrls : [url],
        afterImages: [url],
        problemDescription: fullIncident.description,
        category: fullIncident.category?.name || "Civic Problem",
      });

      // Update incident to VERIFICATION_PENDING so citizen can inspect and confirm
      await prisma.incident.update({
        where: { id: fullIncident.id },
        data: { status: "VERIFICATION_PENDING" },
      });

      // Status History
      await prisma.statusHistory.create({
        data: {
          incidentId: fullIncident.id,
          fromStatus: fullIncident.status,
          toStatus: "VERIFICATION_PENDING",
          actorId: user.id,
          actorName: user.name || "Field Engineer",
          actorRole: user.role || "AUTHORITY",
          reason: `Repair evidence uploaded. AI verification confidence: ${Math.round(
            comparison.resolutionConfidence * 100
          )}%. Awaiting citizen confirmation.`,
          evidenceId: evidence.id,
        },
      });

      // Create Verification record
      await prisma.verification.create({
        data: {
          incidentId: fullIncident.id,
          status: "PENDING",
          aiMatchScore: comparison.sameLocationLikelihood,
          visibleChangeDetected: comparison.visibleChange,
          resolutionConfidence: comparison.resolutionConfidence,
        },
      });

      // Notify citizen reporters
      const citizenIds = Array.from(
        new Set(fullIncident.reports.map((r) => r.citizenId).filter(Boolean))
      ) as string[];

      for (const citizenId of citizenIds) {
        await createNotification(
          citizenId,
          "Repair Completed — Your Verification Needed",
          `Authority uploaded repair evidence for ${fullIncident.caseId}. Please review the before/after photos and confirm resolution!`,
          "VERIFICATION_REQUEST",
          `/incidents/${fullIncident.caseId}`
        );
      }
    } else if (evidenceType === "INSPECTION") {
      await prisma.statusHistory.create({
        data: {
          incidentId: fullIncident.id,
          fromStatus: fullIncident.status,
          toStatus: "IN_PROGRESS",
          actorId: user.id,
          actorName: user.name || "Field Inspector",
          actorRole: user.role || "AUTHORITY",
          reason: `On-site inspection completed. Notes: ${notes || "Site evaluated."}`,
          evidenceId: evidence.id,
        },
      });

      await prisma.incident.update({
        where: { id: fullIncident.id },
        data: { status: "IN_PROGRESS" },
      });
    }

    // Log Audit Event
    await logAuditEvent({
      actor: user,
      action: "EVIDENCE_UPLOADED",
      entityType: "Incident",
      entityId: fullIncident.id,
      newState: { evidenceType, url, filename },
    });

    return NextResponse.json({
      success: true,
      evidence,
      comparison,
      incidentStatus:
        evidenceType === "REPAIR"
          ? "VERIFICATION_PENDING"
          : evidenceType === "INSPECTION"
          ? "IN_PROGRESS"
          : fullIncident.status,
    });
  }
);
