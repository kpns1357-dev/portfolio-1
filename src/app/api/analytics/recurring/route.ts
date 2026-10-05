import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  const clusters = await prisma.recurringCluster.findMany({
    include: {
      incidents: {
        select: {
          id: true,
          caseId: true,
          title: true,
          status: true,
          priorityScore: true,
          category: { select: { name: true } },
        },
        take: 8,
      },
    },
    orderBy: { totalIncidents: "desc" },
  });

  return NextResponse.json({ clusters });
});
