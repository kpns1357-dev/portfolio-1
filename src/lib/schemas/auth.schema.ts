import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please provide a valid email address.").toLowerCase().trim(),
  password: z.string().min(1, "Password is required."),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(100, "Name cannot exceed 100 characters.").trim(),
  email: z.string().email("Please provide a valid email address.").toLowerCase().trim(),
  password: z.string().min(12, "Password must be at least 12 characters long."),
  phone: z.string().max(20).optional().nullable(),
  role: z.enum(["CITIZEN", "MODERATOR", "AUTHORITY", "SUPER_ADMIN"]).default("CITIZEN"),
  departmentId: z.string().optional().nullable(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
