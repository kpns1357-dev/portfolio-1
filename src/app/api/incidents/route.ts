import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateSla } from "@/lib/sla";
import { incidentQuerySchema } from "@/lib/schemas/incident.schema";
import { withErrorHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  // Validate Query Parameters with Zod
  const query = incidentQuerySchema.parse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    priority: searchParams.get("priority") ?? undefined,
    department: searchParams.get("department") ?? undefined,
    area: searchParams.get("area") ?? undefined,
    slaStatus: searchParams.get("slaStatus") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    forMap: searchParams.get("forMap") ?? undefined,
  });

  const {
    page,
    limit,
    search,
    category,
    status,
    priority,
    department,
    area,
    slaStatus,
    sortBy,
    forMap,
  } = query;

  const where: any = {};

  if (search) {
    where.OR = [
      { caseId: { contains: search } },
      { title: { contains: search } },
      { description: { contains: search } },
      { address: { contains: search } },
      { areaName: { contains: search } },
    ];
  }

  if (category) {
    where.category = {
      OR: [{ id: category }, { slug: category }, { name: category }],
    };
  }

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priorityLabel = priority;
  }

  if (department) {
    where.departmentId = department;
  }

  if (area) {
    where.areaName = area;
  }

  if (slaStatus) {
    where.slaStatus = slaStatus;
  }

  // Map query optimization
  if (forMap) {
    const pins = await prisma.incident.findMany({
      where,
      select: {
        id: true,
        caseId: true,
        title: true,
        status: true,
        priorityScore: true,
        priorityLabel: true,
        latitude: true,
        longitude: true,
        address: true,
        areaName: true,
        slaStatus: true,
        slaDeadline: true,
        category: {
          select: { name: true, slug: true },
        },
        department: {
          select: { name: true },
        },
        _count: {
          select: { reports: true },
        },
      },
      take: 300,
    });

    return NextResponse.json({ pins });
  }

  // Sorting logic
  let orderBy: any = [{ priorityScore: "desc" }, { createdAt: "desc" }];
  if (sortBy === "newest") {
    orderBy = [{ createdAt: "desc" }];
  } else if (sortBy === "oldest") {
    orderBy = [{ createdAt: "asc" }];
  } else if (sortBy === "sla") {
    orderBy = [{ slaDeadline: "asc" }];
  }

  const skip = (page - 1) * limit;

  const [total, incidents] = await Promise.all([
    prisma.incident.count({ where }),
    prisma.incident.findMany({
      where,
      include: {
        category: true,
        department: true,
        team: true,
        reports: {
          select: { id: true, trackingCode: true },
        },
        evidence: {
          take: 2,
          select: { id: true, url: true, evidenceType: true },
        },
        verifications: {
          take: 1,
          select: { status: true, rejectionReason: true },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  // Attach dynamic SLA status evaluation
  const formatted = incidents.map((inc) => {
    const sla = evaluateSla(inc.slaDeadline);
    return {
      ...inc,
      slaInfo: sla,
    };
  });

  return NextResponse.json({
    incidents: formatted,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
