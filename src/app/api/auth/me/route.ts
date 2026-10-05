import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const freshUser = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      departmentId: true,
      teamId: true,
      reliabilityScore: true,
      department: {
        select: { id: true, name: true, code: true },
      },
      team: {
        select: { id: true, name: true },
      },
    },
  });

  if (!freshUser) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      id: freshUser.id,
      email: freshUser.email,
      name: freshUser.name,
      role: freshUser.role,
      departmentId: freshUser.departmentId,
      departmentName: freshUser.department?.name,
      teamId: freshUser.teamId,
      teamName: freshUser.team?.name,
      reliabilityScore: freshUser.reliabilityScore,
    },
  });
});
