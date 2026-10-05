import { z } from "zod";

export const aiAnalyzeInputSchema = z.object({
  text: z
    .string()
    .min(5, "Report text must be at least 5 characters.")
    .max(2000, "Report text cannot exceed 2000 characters.")
    .trim(),
  imageBase64: z.string().max(5000000).optional(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});

export const aiAskInputSchema = z.object({
  query: z
    .string()
    .min(3, "Query must be at least 3 characters.")
    .max(1000, "Query cannot exceed 1000 characters.")
    .trim(),
  incidentId: z.string().optional(),
});

export const aiCompareEvidenceInputSchema = z.object({
  beforeImages: z.array(z.string().min(1)).min(1, "At least one before image is required."),
  afterImages: z.array(z.string().min(1)).min(1, "At least one after image is required."),
  problemDescription: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
});

// Output validation schemas
export const aiAnalysisOutputSchema = z.object({
  detectedProblem: z.string(),
  category: z.string(),
  severityScore: z.number().min(0).max(10),
  safetyRisk: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  recommendedDepartment: z.string(),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  keyFactors: z.array(z.string()),
  isDemo: z.boolean(),
});

export const aiCompareOutputSchema = z.object({
  sameLocationLikelihood: z.number().min(0).max(1),
  visibleChange: z.boolean(),
  originalIssueStillDetected: z.boolean(),
  resolutionConfidence: z.number().min(0).max(1),
  comparisonSummary: z.string(),
  isDemo: z.boolean(),
});

export const aiAskOutputSchema = z.object({
  answer: z.string(),
  citations: z.array(z.string()),
  isSufficientData: z.boolean(),
});

export type AIAnalyzeInput = z.infer<typeof aiAnalyzeInputSchema>;
export type AIAskInput = z.infer<typeof aiAskInputSchema>;
export type AICompareEvidenceInput = z.infer<typeof aiCompareEvidenceInputSchema>;
