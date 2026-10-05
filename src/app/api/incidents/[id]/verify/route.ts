import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { getIncidentWithAccessCheck } from "@/lib/authorize";
import { verifyIncidentSchema } from "@/lib/schemas/incident.schema";
import { withErrorHandler, AppError } from "@/lib/errors";

export const POST = withErrorHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await getSessionFromRequest(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required to verify an incident.");
    }

    // IDOR check (Only reporting citizens, or assigned authorities / admins)
    const baseIncident = await getIncidentWithAccessCheck(user, params.id, "verify");

    const incident = await prisma.incident.findUnique({
      where: { id: baseIncident.id },
      include: {
        department: true,
        team: true,
        verifications: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!incident) {
      throw AppError.notFound("Incident not found.");
    }

    const body = await req.json();
    const { confirmed, rejectionReason, citizenNotes, evidenceUrl } =
      verifyIncidentSchema.parse(body);

    if (confirmed) {
      // CITIZEN / AUTHORITY CONFIRMS RESOLUTION
      const resolvedAt = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.incident.update({
          where: { id: incident.id },
          data: {
            status: "RESOLVED",
            resolvedAt,
          },
        });

        // Update verification record
        if (incident.verifications.length > 0) {
          await tx.verification.update({
            where: { id: incident.verifications[0].id },
            data: {
              status: "CONFIRMED",
              citizenId: user.id,
              citizenNotes: citizenNotes || "Citizen confirmed repair verified on-site.",
              respondedAt: resolvedAt,
            },
          });
        } else {
          await tx.verification.create({
            data: {
              incidentId: incident.id,
              citizenId: user.id,
              status: "CONFIRMED",
              citizenNotes: citizenNotes || "Citizen confirmed resolution.",
              respondedAt: resolvedAt,
            },
          });
        }

        // Status History
        await tx.statusHistory.create({
          data: {
            incidentId: incident.id,
            fromStatus: incident.status,
            toStatus: "RESOLVED",
            actorId: user.id,
            actorName: user.name || "Citizen Verifier",
            actorRole: user.role || "CITIZEN",
            reason: `Citizen verified repair: ${
              citizenNotes || "Work confirmed successfully completed."
            }`,
          },
        });
      });

      // Audit Log
      await logAuditEvent({
        actor: user,
        action: "RESOLUTION_CONFIRMED",
        entityType: "Incident",
        entityId: incident.id,
        previousState: { status: incident.status },
        newState: { status: "RESOLVED", notes: citizenNotes },
      });

      return NextResponse.json({
        success: true,
        message: "Resolution verified and incident officially resolved.",
        status: "RESOLVED",
      });
    } else {
      // CITIZEN REJECTS RESOLUTION -> REOPEN INCIDENT
      const reopenedAt = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.incident.update({
          where: { id: incident.id },
          data: {
            status: "REOPENED",
            resolvedAt: null,
            priorityScore: Math.min(100, incident.priorityScore + 10),
            priorityLabel: incident.priorityScore + 10 >= 75 ? "CRITICAL" : "HIGH",
          },
        });

        if (evidenceUrl) {
          await tx.evidence.create({
            data: {
              incidentId: incident.id,
              evidenceType: "CITIZEN_REJECTION",
              url: evidenceUrl,
              filename: `rejection_proof_${incident.caseId}.jpg`,
              mimeType: "image/jpeg",
              notes: `Citizen photo evidence indicating unresolved defect: ${citizenNotes || ""}`,
              uploaderId: user.id,
            },
          });
        }

        if (incident.verifications.length > 0) {
          await tx.verification.update({
            where: { id: incident.verifications[0].id },
            data: {
              status: "REJECTED",
              citizenId: user.id,
              rejectionReason: rejectionReason || "STILL_EXISTS",
              citizenNotes: citizenNotes || "Citizen inspected site and rejected resolution.",
              respondedAt: reopenedAt,
            },
          });
        } else {
          await tx.verification.create({
            data: {
              incidentId: incident.id,
              citizenId: user.id,
              status: "REJECTED",
              rejectionReason: rejectionReason || "STILL_EXISTS",
              citizenNotes: citizenNotes || "Citizen inspected site and rejected resolution.",
              respondedAt: reopenedAt,
            },
          });
        }

        await tx.statusHistory.create({
          data: {
            incidentId: incident.id,
            fromStatus: incident.status,
            toStatus: "REOPENED",
            actorId: user.id,
            actorName: user.name || "Citizen Reporter",
            actorRole: user.role || "CITIZEN",
            reason: `Resolution rejected by citizen. Reason: ${rejectionReason}. Notes: ${
              citizenNotes || "Issue still persists."
            }`,
          },
        });
      });

      await logAuditEvent({
        actor: user,
        action: "RESOLUTION_REJECTED",
        entityType: "Incident",
        entityId: incident.id,
        previousState: { status: incident.status },
        newState: {
          status: "REOPENED",
          rejectionReason,
          citizenNotes,
        },
      });

      const authorityUsers = await prisma.user.findMany({
        where: {
          role: "AUTHORITY",
          departmentId: incident.departmentId || undefined,
        },
        take: 3,
      });

      for (const authUser of authorityUsers) {
        await createNotification(
          authUser.id,
          `Resolution Rejected: Case ${incident.caseId} Reopened`,
          `Citizen reported issue is NOT fixed (${rejectionReason}). Incident returned to high-priority active queue.`,
          "STATUS_CHANGE",
          `/incidents/${incident.caseId}`
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "Resolution rejected. Incident has been reopened and escalated to field supervisors.",
        status: "REOPENED",
      });
    }
  }
);
