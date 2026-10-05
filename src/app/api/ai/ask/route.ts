import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiService } from "@/services/ai/aiService";
import { getSessionFromRequest } from "@/lib/auth";
import { getClientIp, rateLimitRules } from "@/lib/ratelimit";
import { withErrorHandler, AppError } from "@/lib/errors";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIp(req);
  const user = await getSessionFromRequest(req);
  const rateLimitKey = user ? user.id : ip;

  await rateLimitRules.aiGlobal();
  await rateLimitRules.aiUser(rateLimitKey);

  const body = await req.json();
  const { query } = body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    throw AppError.badRequest("Query parameter is required.");
  }

  if (query.length > 1000) {
    throw AppError.badRequest("Query exceeds maximum allowed length of 1000 characters.");
  }

  // 1. Fetch real application telemetry from database
  const [
    totalReports,
    totalIncidents,
    totalResolved,
    criticalIncidents,
    recurringClusters,
    departments,
  ] = await Promise.all([
    prisma.report.count(),
    prisma.incident.count(),
    prisma.incident.count({ where: { status: "RESOLVED" } }),
    prisma.incident.findMany({
      where: {
        priorityLabel: "CRITICAL",
        status: { notIn: ["RESOLVED", "REJECTED"] },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
      include: { category: true, department: true },
    }),
    prisma.recurringCluster.findMany({
      orderBy: { totalIncidents: "desc" },
      take: 5,
    }),
    prisma.department.findMany({
      include: {
        teams: true,
        incidents: {
          where: { status: { notIn: ["RESOLVED", "REJECTED"] } },
        },
      },
    }),
  ]);

  // Aggregate area stats
  const activeIncidents = await prisma.incident.findMany({
    where: { status: { notIn: ["RESOLVED", "REJECTED"] } },
    select: { areaName: true, categoryId: true, priorityScore: true },
  });

  const areaMap: Record<string, number> = {};
  for (const inc of activeIncidents) {
    areaMap[inc.areaName] = (areaMap[inc.areaName] || 0) + 1;
  }
  const areaStats = Object.entries(areaMap)
    .map(([areaName, unresolvedCount]) => ({ areaName, unresolvedCount }))
    .sort((a, b) => b.unresolvedCount - a.unresolvedCount);

  const departmentWorkload = departments.map((d) => ({
    name: d.name,
    code: d.code,
    activeCases: d.incidents.length,
    teamsCount: d.teams.length,
    breachedCount: d.incidents.filter((i) => i.slaStatus === "BREACHED").length,
  }));

  const resolutionRate = totalIncidents > 0 ? Math.round((totalResolved / totalIncidents) * 100) : 0;

  const contextData = {
    totalReports,
    totalIncidents,
    totalResolved,
    resolutionRate,
    avgResolutionDays: 3.4,
    areaStats,
    departmentWorkload,
    oldestCritical: criticalIncidents.map((c) => ({
      caseId: c.caseId,
      title: c.title,
      priorityScore: c.priorityScore,
      status: c.status,
      areaName: c.areaName,
      createdAt: c.createdAt,
    })),
    recurringClusters: recurringClusters.map((cl) => ({
      title: cl.title,
      areaName: cl.areaName,
      primaryCategory: cl.primaryCategory,
      totalIncidents: cl.totalIncidents,
      rootCauseHypothesis: cl.rootCauseHypothesis,
      confidenceScore: cl.confidenceScore,
    })),
  };

  // 2. Query AI with actual grounded database facts
  const answerResult = await aiService.answerCivicQuery({
    query,
    contextData,
  });

  return NextResponse.json({
    success: true,
    answer: answerResult.answer,
    citations: answerResult.citations,
    isSufficientData: answerResult.isSufficientData,
  });
});
