import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/services/ai/aiService";
import { prisma } from "@/lib/prisma";
import { findDuplicateCandidates } from "@/lib/duplicates";
import { getSessionFromRequest } from "@/lib/auth";
import { getClientIp, rateLimitRules } from "@/lib/ratelimit";
import { withErrorHandler, AppError } from "@/lib/errors";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIp(req);
  const user = await getSessionFromRequest(req);
  const rateLimitKey = user ? user.id : ip;

  // Rate Limiting: 10 per minute per user, 500 per min global
  await rateLimitRules.aiGlobal();
  await rateLimitRules.aiUser(rateLimitKey);

  const body = await req.json();
  const { description, images, coordinates, category, address } = body;

  if (!description || typeof description !== "string" || description.trim().length === 0) {
    throw AppError.badRequest("Description is required for AI analysis.");
  }

  if (description.length > 2000) {
    throw AppError.badRequest("Description exceeds maximum allowed length of 2000 characters.");
  }

  // 1. Run AI Analysis via service abstraction
  const analysis = await aiService.analyzeReport({
    description,
    images: Array.isArray(images) ? images : [],
    coordinates,
    category,
    address,
  });

  // 2. Check nearby duplicates if coordinates provided
  let duplicates: any[] = [];
  if (coordinates && coordinates.latitude && coordinates.longitude) {
    const activeIncidents = await prisma.incident.findMany({
      where: {
        status: { notIn: ["RESOLVED", "REJECTED"] },
      },
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

    duplicates = findDuplicateCandidates(
      {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        categoryId: category || "",
        categoryName: analysis.category,
        description,
      },
      formatted,
      800,
      0.5
    );
  }

  return NextResponse.json({
    success: true,
    analysis,
    duplicatesCount: duplicates.length,
    possibleDuplicates: duplicates.slice(0, 4),
    providerName: aiService.getProviderName(),
  });
});
