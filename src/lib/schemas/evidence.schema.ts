import { z } from "zod";

export const uploadEvidenceSchema = z.object({
  url: z.string().min(1, "Evidence URL is required.").max(500),
  evidenceType: z
    .enum(["CITIZEN_SUBMISSION", "INSPECTION", "REPAIR", "CITIZEN_REJECTION"])
    .default("REPAIR"),
  notes: z.string().max(1000).optional().nullable(),
  filename: z.string().max(255).optional().default("evidence.jpg"),
});

export type UploadEvidenceInput = z.infer<typeof uploadEvidenceSchema>;
