import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  const departments = await prisma.department.findMany({
    include: {
      teams: {
        orderBy: { activeWorkload: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ departments });
});
