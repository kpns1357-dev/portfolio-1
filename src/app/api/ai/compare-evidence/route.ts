import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/services/ai/aiService";
import { getSessionFromRequest } from "@/lib/auth";
import { getClientIp, rateLimitRules } from "@/lib/ratelimit";
import { withErrorHandler, AppError } from "@/lib/errors";
import { aiCompareEvidenceInputSchema } from "@/lib/schemas/ai.schema";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIp(req);
  const user = await getSessionFromRequest(req);
  const rateLimitKey = user ? user.id : ip;

  await rateLimitRules.aiGlobal();
  await rateLimitRules.aiUser(rateLimitKey);

  const body = await req.json();
  const parsed = aiCompareEvidenceInputSchema.parse(body);

  const result = await aiService.compareEvidence({
    beforeImages: parsed.beforeImages,
    afterImages: parsed.afterImages,
    problemDescription: parsed.problemDescription || "",
    category: parsed.category || "",
  });

  return NextResponse.json({
    success: true,
    comparison: result,
    providerName: aiService.getProviderName(),
  });
});
