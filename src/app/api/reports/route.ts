import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { aiService } from "@/services/ai/aiService";
import { calculatePriorityScore, getPriorityLabel } from "@/lib/priority";
import { calculateSlaDeadline } from "@/lib/sla";
import { findDuplicateCandidates } from "@/lib/duplicates";
import { logAuditEvent } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { createReportSchema } from "@/lib/schemas/incident.schema";
import { getClientIp, rateLimitRules } from "@/lib/ratelimit";
import { withErrorHandler, AppError } from "@/lib/errors";
import { isSuperOrAdmin } from "@/lib/authorize";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await getSessionFromRequest(req);
  const { searchParams } = new URL(req.url);
  const myReportsOnly = searchParams.get("mine") === "true";

  const isPrivileged =
    user && (isSuperOrAdmin(user) || user.role === "AUTHORITY" || user.role === "MODERATOR");

  const where: any = {};
  if (myReportsOnly) {
    if (!user) {
      throw AppError.unauthorized("Authentication required to view your reports.");
    }
    where.citizenId = user.id;
  } else if (!isPrivileged) {
    // Non-privileged users only see their own reports in reports list API
    if (user) {
      where.citizenId = user.id;
    } else {
      where.anonymity = "PUBLIC";
    }
  }

  const reports = await prisma.report.findMany({
    where,
    include: {
      category: true,
      incident: {
        select: {
          id: true,
          caseId: true,
          status: true,
          priorityScore: true,
          priorityLabel: true,
          slaStatus: true,
          slaDeadline: true,
        },
      },
      evidence: true,
      aiAnalysis: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ reports });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIp(req);
  const user = await getSessionFromRequest(req);
  const rateLimitKey = user ? user.id : ip;

  // Rate Limiting: 20 report submissions per hour
  await rateLimitRules.createIncident(rateLimitKey);

  const rawBody = await req.json();
  const validated = createReportSchema.parse(rawBody);

  const {
    title,
    description,
    categoryId,
    latitude,
    longitude,
    address,
    landmark,
    anonymity,
    evidenceUrls,
  } = validated;

  const targetIncidentId = rawBody.targetIncidentId || null;

  // Resolve Category
  let resolvedCategory = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { defaultDepartment: true },
  });

  if (!resolvedCategory) {
    resolvedCategory = await prisma.category.findFirst({
      where: { slug: "roads" },
      include: { defaultDepartment: true },
    });
  }

  // Run AI analysis
  const aiAnalysis = await aiService.analyzeReport({
    description,
    images: evidenceUrls,
    coordinates: { latitude, longitude },
    category: resolvedCategory?.name,
    address,
  });

  const reportCount = await prisma.report.count();
  const trackingCode = `REP-2026-${1000 + reportCount + 1}`;

  let linkedIncidentId = targetIncidentId;
  let incidentCaseId = "";

  // If no existing incident target was specified, check duplicates or create new
  if (!linkedIncidentId) {
    const activeIncidents = await prisma.incident.findMany({
      where: { status: { notIn: ["RESOLVED", "REJECTED"] } },
      include: { category: true, reports: true },
      take: 30,
    });

    const formatted = activeIncidents.map((inc) => ({
      id: inc.id,
      caseId: inc.caseId,
      title: inc.title,
      description: inc.description,
      categoryId: inc.categoryId,
      categoryName: inc.category?.name,
      latitude: inc.latitude,
      longitude: inc.longitude,
      status: inc.status,
      createdAt: inc.createdAt,
      reportsCount: inc.reports.length,
    }));

    const duplicateMatches = findDuplicateCandidates(
      {
        latitude,
        longitude,
        categoryId: resolvedCategory?.id || "",
        categoryName: resolvedCategory?.name,
        description,
        title: title || description.substring(0, 40),
      },
      formatted,
      350,
      0.75
    );

    // Create new Incident
    const incidentCount = await prisma.incident.count();
    const generatedCaseId = `CF-2026-${28000 + incidentCount + 1}`;
    incidentCaseId = generatedCaseId;

    const priorityBreakdown = calculatePriorityScore({
      severityScore: aiAnalysis.severityScore,
      safetyRisk: aiAnalysis.safetyRisk,
      reportsCount: 1,
      trafficLevel: "MEDIUM",
      isRecurring: false,
    });

    const priorityLabel = getPriorityLabel(priorityBreakdown.totalScore);
    const createdAt = new Date();
    const slaDeadline = calculateSlaDeadline(createdAt, priorityLabel);

    const deptId = resolvedCategory?.defaultDepartmentId || null;
    let teamId = null;
    if (deptId) {
      const team = await prisma.team.findFirst({
        where: { departmentId: deptId },
        orderBy: { activeWorkload: "asc" },
      });
      teamId = team?.id || null;
    }

    const clusters = await prisma.recurringCluster.findMany({
      where: { status: "ACTIVE" },
    });
    let matchingClusterId = null;
    for (const cl of clusters) {
      const dLat = Math.abs(cl.centerLat - latitude);
      const dLng = Math.abs(cl.centerLng - longitude);
      if (dLat < 0.005 && dLng < 0.005) {
        matchingClusterId = cl.id;
        break;
      }
    }

    const newIncident = await prisma.incident.create({
      data: {
        caseId: generatedCaseId,
        title: title || aiAnalysis.detectedProblem || `${resolvedCategory?.name} defect reported`,
        description,
        categoryId: resolvedCategory?.id!,
        status: "REPORTED",
        priorityScore: priorityBreakdown.totalScore,
        priorityLabel,
        departmentId: deptId,
        teamId,
        latitude,
        longitude,
        address,
        areaName: address.split(",")[1]?.trim() || "Downtown District",
        slaDeadline,
        slaStatus: "NORMAL",
        recurringClusterId: matchingClusterId,
        createdAt,
      },
    });

    linkedIncidentId = newIncident.id;

    // Priority score breakdown
    await prisma.priorityScoreBreakdown.create({
      data: {
        incidentId: newIncident.id,
        severityScore: priorityBreakdown.severityScore,
        safetyScore: priorityBreakdown.safetyScore,
        multipleReportsScore: priorityBreakdown.multipleReportsScore,
        trafficScore: priorityBreakdown.trafficScore,
        durationScore: priorityBreakdown.durationScore,
        recurrenceScore: priorityBreakdown.recurrenceScore,
        totalScore: priorityBreakdown.totalScore,
        explanation: JSON.stringify(priorityBreakdown.explanation),
      },
    });

    // Initial Status History
    await prisma.statusHistory.create({
      data: {
        incidentId: newIncident.id,
        fromStatus: "NONE",
        toStatus: "REPORTED",
        actorId: user?.id || null,
        actorName: user?.name || "Citizen (App)",
        actorRole: user?.role || "CITIZEN",
        reason: "Citizen submitted initial report with location and evidence.",
      },
    });

    // If duplicate matches exist, link duplicate candidates
    for (const match of duplicateMatches) {
      await prisma.duplicateCandidate.create({
        data: {
          reportId: "",
          potentialIncidentId: match.incident.id,
          similarityScore: match.similarityScore,
          distanceMeters: match.distanceMeters,
          status: "DETECTED",
        },
      }).catch(() => {});
    }
  } else {
    const existingInc = await prisma.incident.findUnique({
      where: { id: linkedIncidentId },
    });
    if (existingInc) {
      incidentCaseId = existingInc.caseId;
    }
  }

  // Create Report
  const report = await prisma.report.create({
    data: {
      trackingCode,
      title: title || aiAnalysis.detectedProblem || "Citizen Observation",
      description,
      categoryId: resolvedCategory?.id!,
      citizenId: user?.id || null,
      anonymity,
      latitude,
      longitude,
      address,
      landmark: landmark || null,
      incidentId: linkedIncidentId,
    },
  });

  // Save AI Analysis
  await prisma.aIAnalysis.create({
    data: {
      reportId: report.id,
      detectedProblem: aiAnalysis.detectedProblem,
      category: aiAnalysis.category,
      severityScore: aiAnalysis.severityScore,
      safetyRisk: aiAnalysis.safetyRisk,
      recommendedDepartment: aiAnalysis.recommendedDepartment,
      summary: aiAnalysis.summary,
      confidence: aiAnalysis.confidence,
      isDemo: aiAnalysis.isDemo,
    },
  });

  // Save Evidence items
  if (evidenceUrls && evidenceUrls.length > 0) {
    for (const url of evidenceUrls) {
      await prisma.evidence.create({
        data: {
          reportId: report.id,
          incidentId: linkedIncidentId,
          evidenceType: "CITIZEN_SUBMISSION",
          url,
          filename: `evidence_${report.trackingCode}.jpg`,
          mimeType: "image/jpeg",
          notes: "Uploaded during citizen submission wizard",
          uploaderId: user?.id || null,
        },
      });
    }
  }

  // Log Audit Event
  await logAuditEvent({
    actor: user,
    action: "REPORT_CREATED",
    entityType: "Report",
    entityId: report.id,
    newState: { trackingCode, incidentCaseId, address },
  });

  // In-app Notification
  if (user?.id) {
    await createNotification(
      user.id,
      "Report Submitted Successfully",
      `Your observation was assigned tracking code ${trackingCode} and filed under incident ${incidentCaseId}.`,
      "INFO",
      `/incidents/${incidentCaseId}`
    );
  }

  return NextResponse.json({
    success: true,
    report: {
      id: report.id,
      trackingCode,
      incidentId: linkedIncidentId,
      incidentCaseId,
      aiAnalysis,
    },
  });
});
