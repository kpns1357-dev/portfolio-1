import { z } from "zod";

export const moderationActionSchema = z.object({
  reportId: z.string().min(1, "Report ID is required."),
  action: z.enum(["APPROVE", "REJECT", "FLAG_SPAM", "FLAG_ABUSIVE", "EDIT_CATEGORY"]),
  newCategoryId: z.string().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const duplicateMergeSchema = z.object({
  sourceIncidentId: z.string().min(1, "Source incident ID is required."),
  targetIncidentId: z.string().min(1, "Target incident ID is required."),
  notes: z.string().max(500).optional().nullable(),
});

export const duplicateCheckSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(10).max(2000),
  categoryId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type ModerationActionInput = z.infer<typeof moderationActionSchema>;
export type DuplicateMergeInput = z.infer<typeof duplicateMergeSchema>;
export type DuplicateCheckInput = z.infer<typeof duplicateCheckSchema>;
