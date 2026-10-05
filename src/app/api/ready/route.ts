import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Probe database connectivity with simple query
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Readiness probe failure:", err);
    return NextResponse.json(
      {
        status: "unready",
        database: "disconnected",
        error: "Database connectivity check failed.",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
