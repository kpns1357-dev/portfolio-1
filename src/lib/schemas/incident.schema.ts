import { z } from "zod";

export const createReportSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters.")
    .max(150, "Title cannot exceed 150 characters.")
    .trim(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters long.")
    .max(2000, "Description cannot exceed 2000 characters.")
    .trim(),
  categoryId: z.string().min(1, "Category is required."),
  latitude: z.number().min(-90).max(90, "Invalid latitude coordinate."),
  longitude: z.number().min(-180).max(180, "Invalid longitude coordinate."),
  address: z
    .string()
    .min(3, "Address must be at least 3 characters.")
    .max(300, "Address cannot exceed 300 characters.")
    .trim(),
  landmark: z.string().max(200).optional().nullable(),
  anonymity: z.enum(["PUBLIC", "HIDDEN", "ANONYMOUS"]).default("PUBLIC"),
  evidenceUrls: z.array(z.string().min(1)).optional().default([]),
});

export const updateIncidentSchema = z.object({
  title: z.string().min(3).max(150).trim().optional(),
  description: z.string().min(10).max(2000).trim().optional(),
  categoryId: z.string().optional(),
  departmentId: z.string().nullable().optional(),
  priorityLabel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  priorityScore: z.number().min(0).max(100).optional(),
});

export const assignIncidentSchema = z.object({
  teamId: z.string().min(1, "Team ID is required."),
  departmentId: z.string().min(1, "Department ID is required."),
  notes: z.string().max(500).optional().nullable(),
});

export const statusChangeSchema = z.object({
  toStatus: z.enum([
    "REPORTED",
    "UNDER_REVIEW",
    "VERIFIED",
    "ASSIGNED",
    "INSPECTION_PENDING",
    "IN_PROGRESS",
    "REPAIR_COMPLETED",
    "VERIFICATION_PENDING",
    "RESOLVED",
    "REJECTED",
    "REOPENED",
    "ESCALATED",
  ]),
  reason: z.string().min(3, "Reason must be at least 3 characters.").max(500),
  notes: z.string().max(1000).optional().nullable(),
});

export const verifyIncidentSchema = z.object({
  confirmed: z.boolean(),
  rejectionReason: z
    .enum(["STILL_EXISTS", "PARTIALLY_FIXED", "WRONG_LOCATION", "NEW_DAMAGE", "OTHER"])
    .optional()
    .nullable(),
  citizenNotes: z.string().max(1000).optional().nullable(),
  evidenceUrl: z.string().min(1).optional().nullable(),
});

export const incidentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  search: z.string().max(100).optional().default(""),
  category: z.string().optional().default(""),
  status: z.string().optional().default(""),
  priority: z.string().optional().default(""),
  department: z.string().optional().default(""),
  area: z.string().optional().default(""),
  slaStatus: z.string().optional().default(""),
  sortBy: z.enum(["priority", "newest", "oldest", "sla"]).default("priority"),
  forMap: z.coerce.boolean().default(false),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type AssignIncidentInput = z.infer<typeof assignIncidentSchema>;
export type StatusChangeInput = z.infer<typeof statusChangeSchema>;
export type VerifyIncidentInput = z.infer<typeof verifyIncidentSchema>;
