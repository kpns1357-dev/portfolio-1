import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findDuplicateCandidates } from "@/lib/duplicates";
import { getSessionFromRequest } from "@/lib/auth";
import { getClientIp, rateLimitRules } from "@/lib/ratelimit";
import { duplicateCheckSchema } from "@/lib/schemas/moderation.schema";
import { withErrorHandler } from "@/lib/errors";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIp(req);
  const user = await getSessionFromRequest(req);
  const rateLimitKey = user ? user.id : ip;

  await rateLimitRules.duplicateCheck(rateLimitKey);

  const body = await req.json();
  const { latitude, longitude, categoryId, description, title } =
    duplicateCheckSchema.parse(body);

  const activeIncidents = await prisma.incident.findMany({
    where: {
      status: { notIn: ["RESOLVED", "REJECTED"] },
    },
    include: { category: true, reports: true },
    take: 40,
  });

  const candidates = activeIncidents.map((inc) => ({
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

  const matches = findDuplicateCandidates(
    {
      latitude,
      longitude,
      categoryId,
      categoryName: "",
      description,
      title,
    },
    candidates,
    700,
    0.5
  );

  return NextResponse.json({
    success: true,
    count: matches.length,
    matches,
  });
});
