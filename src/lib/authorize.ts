import { prisma } from "./prisma";
import { SessionUser, UserRole } from "./types";
import { AppError } from "./errors";
import { logSecurityViolation } from "./logger";

export function isSuperOrAdmin(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === "SUPER_ADMIN" || (user.role as string) === "ADMIN";
}

export function requireRole(user: SessionUser | null, allowedRoles: UserRole[]): void {
  if (!user) {
    throw AppError.unauthorized("Authentication required to access this resource.");
  }
  if (isSuperOrAdmin(user)) return;
  if (!allowedRoles.includes(user.role)) {
    logSecurityViolation({
      type: "RBAC_VIOLATION",
      userId: user.id,
      endpoint: "RBAC Check",
      details: { role: user.role, requiredRoles: allowedRoles },
    });
    throw AppError.forbidden("Access denied: Insufficient privileges.");
  }
}

export function assertOwnerOrRole(
  user: SessionUser | null,
  resourceOwnerId: string | null | undefined,
  allowedRoles: UserRole[]
): void {
  if (!user) {
    throw AppError.unauthorized("Authentication required.");
  }
  if (resourceOwnerId && user.id === resourceOwnerId) {
    return;
  }
  if (isSuperOrAdmin(user)) {
    return;
  }
  if (allowedRoles.includes(user.role)) {
    return;
  }
  logSecurityViolation({
    type: "IDOR_ATTEMPT",
    userId: user.id,
    endpoint: "Owner/Role Check",
    details: { resourceOwnerId, userRole: user.role },
  });
  throw AppError.forbidden("You do not have permission to access or modify this resource.");
}

export async function canReadIncident(
  user: SessionUser | null,
  incidentId: string
): Promise<boolean> {
  if (!user) return false;
  if (isSuperOrAdmin(user) || user.role === "AUTHORITY" || user.role === "MODERATOR") {
    return true;
  }

  const incident = await prisma.incident.findFirst({
    where: {
      OR: [{ id: incidentId }, { caseId: incidentId }],
    },
    select: {
      id: true,
      reports: {
        select: { citizenId: true },
      },
    },
  });

  if (!incident) return false;
  return incident.reports.some((r) => r.citizenId === user.id);
}

export async function canWriteIncident(
  user: SessionUser | null,
  incidentId: string
): Promise<boolean> {
  if (!user) return false;
  if (isSuperOrAdmin(user)) return true;

  const incident = await prisma.incident.findFirst({
    where: {
      OR: [{ id: incidentId }, { caseId: incidentId }],
    },
    select: {
      id: true,
      status: true,
      departmentId: true,
      reports: {
        select: { citizenId: true },
      },
    },
  });

  if (!incident) return false;

  if (user.role === "AUTHORITY") {
    if (!incident.departmentId || !user.departmentId) return true;
    return incident.departmentId === user.departmentId;
  }

  if (user.role === "CITIZEN") {
    const isOwner = incident.reports.some((r) => r.citizenId === user.id);
    const isPreAssignment = incident.status === "REPORTED" || incident.status === "UNDER_REVIEW";
    return isOwner && isPreAssignment;
  }

  return false;
}

export async function canVerifyIncident(
  user: SessionUser | null,
  incidentId: string
): Promise<boolean> {
  if (!user) return false;
  if (isSuperOrAdmin(user)) return true;

  const incident = await prisma.incident.findFirst({
    where: {
      OR: [{ id: incidentId }, { caseId: incidentId }],
    },
    select: {
      id: true,
      departmentId: true,
      reports: {
        select: { citizenId: true },
      },
    },
  });

  if (!incident) return false;

  if (user.role === "AUTHORITY") {
    if (!incident.departmentId || !user.departmentId) return true;
    return incident.departmentId === user.departmentId;
  }

  if (user.role === "CITIZEN") {
    return incident.reports.some((r) => r.citizenId === user.id);
  }

  return false;
}

/**
 * Loads an incident by ID or caseId and verifies user permission.
 * Prevents enumeration: returns 404 if not found, 403 if found but unauthorized.
 */
export async function getIncidentWithAccessCheck(
  user: SessionUser | null,
  identifier: string,
  mode: "read" | "write" | "verify" | "assign" | "status"
) {
  const incident = await prisma.incident.findFirst({
    where: { OR: [{ id: identifier }, { caseId: identifier }] },
    include: {
      reports: { select: { citizenId: true } },
    },
  });

  if (!incident) {
    throw AppError.notFound("Incident not found.");
  }

  if (!user) {
    throw AppError.unauthorized("Authentication required to access this incident.");
  }

  if (isSuperOrAdmin(user)) {
    return incident;
  }

  if (mode === "read") {
    if (user.role === "AUTHORITY" || user.role === "MODERATOR") {
      return incident;
    }
    const isOwner = incident.reports.some((r) => r.citizenId === user.id);
    if (!isOwner) {
      logSecurityViolation({
        type: "IDOR_ATTEMPT",
        userId: user.id,
        endpoint: `/api/incidents/${identifier}`,
        details: { mode: "read", incidentId: incident.id },
      });
      throw AppError.forbidden("Access denied: You can only view your own incidents.");
    }
    return incident;
  }

  if (mode === "write") {
    if (user.role === "AUTHORITY") {
      if (!incident.departmentId || !user.departmentId || incident.departmentId === user.departmentId) {
        return incident;
      }
      throw AppError.forbidden("Access denied: Incident is assigned to a different department.");
    }
    if (user.role === "CITIZEN") {
      const isOwner = incident.reports.some((r) => r.citizenId === user.id);
      const isPreAssignment = incident.status === "REPORTED" || incident.status === "UNDER_REVIEW";
      if (isOwner && isPreAssignment) {
        return incident;
      }
      throw AppError.forbidden("Access denied: Incidents in progress cannot be edited by citizens.");
    }
    throw AppError.forbidden("Insufficient permissions to modify incident.");
  }

  if (mode === "assign") {
    if (user.role === "AUTHORITY") {
      if (!incident.departmentId || !user.departmentId || incident.departmentId === user.departmentId) {
        return incident;
      }
      throw AppError.forbidden("Access denied: Incident belongs to another department.");
    }
    throw AppError.forbidden("Only Authorities or Administrators can assign incidents.");
  }

  if (mode === "status") {
    if (user.role === "AUTHORITY") {
      if (!incident.departmentId || !user.departmentId || incident.departmentId === user.departmentId) {
        return incident;
      }
      throw AppError.forbidden("Access denied: Cannot update status of incident in another department.");
    }
    throw AppError.forbidden("Only assigned Authorities or Administrators can change incident status.");
  }

  if (mode === "verify") {
    if (user.role === "AUTHORITY") {
      if (!incident.departmentId || !user.departmentId || incident.departmentId === user.departmentId) {
        return incident;
      }
      throw AppError.forbidden("Access denied: Incident belongs to another department.");
    }
    if (user.role === "CITIZEN") {
      const isOwner = incident.reports.some((r) => r.citizenId === user.id);
      if (isOwner) {
        return incident;
      }
      throw AppError.forbidden("Access denied: Only citizens associated with this report may verify its resolution.");
    }
    throw AppError.forbidden("Insufficient permissions to verify this incident.");
  }

  return incident;
}
