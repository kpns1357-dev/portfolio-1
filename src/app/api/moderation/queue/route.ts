import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { requireRole } from "@/lib/authorize";
import { withErrorHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await getSessionFromRequest(req);
  requireRole(user, ["MODERATOR", "SUPER_ADMIN"]);

  // 1. Fetch unreviewed/unverified incidents or flagged reports
  const [flaggedReports, pendingIncidents, duplicateCandidates] = await Promise.all([
    prisma.report.findMany({
      where: {
        OR: [
          { moderationFlag: { not: "CLEAN" } },
          { incident: { status: "REPORTED" } },
        ],
      },
      include: {
        citizen: { select: { id: true, name: true, email: true, reliabilityScore: true } },
        category: true,
        evidence: true,
        aiAnalysis: true,
        incident: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.incident.findMany({
      where: {
        status: { in: ["REPORTED", "UNDER_REVIEW"] },
      },
      include: {
        category: true,
        department: true,
        reports: { include: { evidence: true } },
        evidence: true,
      },
      orderBy: { priorityScore: "desc" },
      take: 20,
    }),
    prisma.duplicateCandidate.findMany({
      where: { status: "DETECTED" },
      include: {
        report: { include: { category: true, citizen: true } },
        potentialIncident: { include: { category: true, department: true } },
      },
      orderBy: { similarityScore: "desc" },
      take: 15,
    }),
  ]);

  return NextResponse.json({
    flaggedReports,
    pendingIncidents,
    duplicateCandidates,
  });
});
