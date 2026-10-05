import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { getIncidentWithAccessCheck, isSuperOrAdmin } from "@/lib/authorize";
import { rateLimitRules } from "@/lib/ratelimit";
import { createCommentSchema } from "@/lib/schemas/comment.schema";
import { withErrorHandler, AppError } from "@/lib/errors";

export const GET = withErrorHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await getSessionFromRequest(req);
    const incident = await getIncidentWithAccessCheck(user, params.id, "read");

    const isAuthorityOrAdmin =
      user && (isSuperOrAdmin(user) || user.role === "AUTHORITY" || user.role === "MODERATOR");

    const comments = await prisma.comment.findMany({
      where: {
        incidentId: incident.id,
        ...(isAuthorityOrAdmin ? {} : { isInternal: false }),
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ comments });
  }
);

export const POST = withErrorHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await getSessionFromRequest(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required to post a comment.");
    }

    // Rate Limiting: 30 comments per hour per user
    await rateLimitRules.comments(user.id);

    // IDOR Access Check (Anyone with read access)
    const incident = await getIncidentWithAccessCheck(user, params.id, "read");

    const body = await req.json();
    const { content, isInternal } = createCommentSchema.parse(body);

    const isPrivileged =
      isSuperOrAdmin(user) || user.role === "AUTHORITY" || user.role === "MODERATOR";

    const comment = await prisma.comment.create({
      data: {
        incidentId: incident.id,
        authorId: user.id,
        authorName: user.name || "Citizen User",
        authorRole: user.role,
        content,
        isInternal: isPrivileged ? isInternal : false,
      },
    });

    return NextResponse.json({ success: true, comment });
  }
);
