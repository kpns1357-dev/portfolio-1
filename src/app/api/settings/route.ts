import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { requireRole } from "@/lib/authorize";
import { DEFAULT_PRIORITY_WEIGHTS } from "@/lib/priority";
import { DEFAULT_SLA_DURATIONS } from "@/lib/sla";
import { logAuditEvent } from "@/lib/audit";
import { withErrorHandler, AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  const settings = await prisma.systemSetting.findMany();
  const configMap: Record<string, any> = {};

  for (const s of settings) {
    try {
      configMap[s.key] = JSON.parse(s.value);
    } catch {
      configMap[s.key] = s.value;
    }
  }

  return NextResponse.json({
    slaDurations: configMap.slaDurations || DEFAULT_SLA_DURATIONS,
    priorityWeights: configMap.priorityWeights || DEFAULT_PRIORITY_WEIGHTS,
    aiProvider: configMap.aiProvider || {
      provider: "local",
      model: "CivicEngine-v2",
      active: true,
    },
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await getSessionFromRequest(req);
  requireRole(user, ["SUPER_ADMIN"]);

  const body = await req.json();
  const { key, value, description } = body;

  if (!key || typeof key !== "string" || value === undefined) {
    throw AppError.badRequest("Key (string) and value are required.");
  }

  const stringVal = typeof value === "object" ? JSON.stringify(value) : String(value);

  const setting = await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: stringVal, description },
    update: { value: stringVal, description },
  });

  await logAuditEvent({
    actor: user,
    action: "SETTING_UPDATED",
    entityType: "SystemSetting",
    entityId: key,
    newState: value,
  });

  return NextResponse.json({ success: true, setting });
});
