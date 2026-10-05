import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  const categories = await prisma.category.findMany({
    include: {
      defaultDepartment: true,
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories });
});
