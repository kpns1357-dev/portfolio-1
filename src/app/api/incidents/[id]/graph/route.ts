import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { getIncidentWithAccessCheck } from "@/lib/authorize";
import { withErrorHandler, AppError } from "@/lib/errors";

export const GET = withErrorHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await getSessionFromRequest(req);

    // IDOR Check
    await getIncidentWithAccessCheck(user, params.id, "read");

    const incident = await prisma.incident.findFirst({
      where: { OR: [{ id: params.id }, { caseId: params.id }] },
      include: {
        category: true,
        department: true,
        team: true,
        reports: {
          include: { evidence: true },
        },
        evidence: true,
        verifications: true,
        recurringCluster: true,
        sourceRelations: { include: { targetIncident: true } },
        targetRelations: { include: { sourceIncident: true } },
      },
    });

    if (!incident) {
      throw AppError.notFound("Incident not found.");
    }

    // Build Graph Nodes & Edges
    const nodes: any[] = [];
    const edges: any[] = [];

    // Root 1: Location Node
    const locationNodeId = `loc_${incident.id}`;
    nodes.push({
      id: locationNodeId,
      label: incident.areaName,
      sublabel: incident.address,
      type: "LOCATION",
      color: "#0284c7",
    });

    // Central Incident Node
    const incidentNodeId = `inc_${incident.id}`;
    nodes.push({
      id: incidentNodeId,
      label: incident.caseId,
      sublabel: incident.title,
      type: "INCIDENT",
      priority: incident.priorityLabel,
      status: incident.status,
      color:
        incident.priorityLabel === "CRITICAL"
          ? "#ef4444"
          : incident.priorityLabel === "HIGH"
          ? "#f97316"
          : "#3b82f6",
    });

    edges.push({
      id: `edge_loc_inc`,
      source: locationNodeId,
      target: incidentNodeId,
      label: "Occurs at",
    });

    // Department Node
    if (incident.department) {
      const deptNodeId = `dept_${incident.department.id}`;
      nodes.push({
        id: deptNodeId,
        label: incident.department.name,
        sublabel: `Code: ${incident.department.code}`,
        type: "DEPARTMENT",
        color: "#6366f1",
      });
      edges.push({
        id: `edge_inc_dept`,
        source: incidentNodeId,
        target: deptNodeId,
        label: "Assigned To",
      });

      // Team Node
      if (incident.team) {
        const teamNodeId = `team_${incident.team.id}`;
        nodes.push({
          id: teamNodeId,
          label: incident.team.name,
          sublabel: `Lead: ${incident.team.leadName || "Field Crew"}`,
          type: "TEAM",
          color: "#8b5cf6",
        });
        edges.push({
          id: `edge_dept_team`,
          source: deptNodeId,
          target: teamNodeId,
          label: "Dispatched",
        });
      }
    }

    // Reports Nodes
    incident.reports.forEach((rep, idx) => {
      const repNodeId = `rep_${rep.id}`;
      nodes.push({
        id: repNodeId,
        label: rep.trackingCode,
        sublabel: rep.title,
        type: "REPORT",
        color: "#10b981",
      });
      edges.push({
        id: `edge_inc_rep_${idx}`,
        source: incidentNodeId,
        target: repNodeId,
        label: idx === 0 ? "Initial Report" : "Duplicate / Corroboration",
      });
    });

    // Evidence Nodes
    incident.evidence.forEach((ev, idx) => {
      const evNodeId = `ev_${ev.id}`;
      nodes.push({
        id: evNodeId,
        label: ev.evidenceType.replace("_", " "),
        sublabel: ev.filename,
        type: "EVIDENCE",
        url: ev.url,
        color: ev.evidenceType === "REPAIR" ? "#059669" : "#64748b",
      });
      edges.push({
        id: `edge_inc_ev_${idx}`,
        source: incidentNodeId,
        target: evNodeId,
        label: "Evidence",
      });
    });

    // Verification Node
    if (incident.verifications.length > 0) {
      const ver = incident.verifications[0];
      const verNodeId = `ver_${ver.id}`;
      nodes.push({
        id: verNodeId,
        label: `Citizen Verification (${ver.status})`,
        sublabel:
          ver.citizenNotes ||
          (ver.status === "CONFIRMED" ? "Confirmed Fixed" : "Pending Inspection"),
        type: "VERIFICATION",
        color:
          ver.status === "CONFIRMED"
            ? "#10b981"
            : ver.status === "REJECTED"
            ? "#ef4444"
            : "#f59e0b",
      });
      edges.push({
        id: `edge_inc_ver`,
        source: incidentNodeId,
        target: verNodeId,
        label: "Citizen Feedback",
      });
    }

    // Recurring Cluster Node
    if (incident.recurringCluster) {
      const clNodeId = `cluster_${incident.recurringCluster.id}`;
      nodes.push({
        id: clNodeId,
        label: "Recurring Cluster",
        sublabel: incident.recurringCluster.title,
        type: "RECURRING_CLUSTER",
        color: "#d97706",
      });
      edges.push({
        id: `edge_inc_cl`,
        source: incidentNodeId,
        target: clNodeId,
        label: "Belongs to",
      });
    }

    return NextResponse.json({
      nodes,
      edges,
    });
  }
);
