export type UserRole = "CITIZEN" | "MODERATOR" | "AUTHORITY" | "SUPER_ADMIN";

export type IncidentStatus =
  | "REPORTED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "ASSIGNED"
  | "INSPECTION_PENDING"
  | "IN_PROGRESS"
  | "REPAIR_COMPLETED"
  | "VERIFICATION_PENDING"
  | "RESOLVED"
  | "REJECTED"
  | "REOPENED"
  | "ESCALATED";

export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SlaStatus = "NORMAL" | "WARNING" | "BREACHED";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  departmentId?: string | null;
  teamId?: string | null;
  reliabilityScore: number;
}

export interface PriorityBreakdown {
  severityScore: number;
  safetyScore: number;
  multipleReportsScore: number;
  trafficScore: number;
  durationScore: number;
  recurrenceScore: number;
  totalScore: number;
  explanation: Record<string, string>;
}

export interface SlaInfo {
  deadline: string; // ISO string
  hoursRemaining: number;
  isBreached: boolean;
  isWarning: boolean;
  statusText: string;
}

export interface AIAnalysisResult {
  detectedProblem: string;
  category: string;
  severityScore: number; // 0.0 - 10.0
  safetyRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendedDepartment: string;
  summary: string;
  confidence: number; // 0.0 - 1.0
  possibleDuplicatesCount?: number;
  isDemo: boolean;
}

export interface ResolutionComparisonResult {
  sameLocationLikelihood: number; // 0.0 - 1.0
  visibleChange: boolean;
  originalIssueStillDetected: boolean;
  resolutionConfidence: number; // 0.0 - 1.0
  comparisonSummary: string;
}
