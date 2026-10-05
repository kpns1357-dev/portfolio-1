export interface AIReportInput {
  description: string;
  images?: string[];
  coordinates?: { latitude: number; longitude: number };
  category?: string;
  address?: string;
}

export interface AIAnalysisOutput {
  detectedProblem: string;
  category: string;
  severityScore: number; // 0.0 - 10.0
  safetyRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendedDepartment: string;
  summary: string;
  confidence: number; // 0.0 - 1.0
  keyFactors: string[];
  isDemo: boolean;
}

export interface EvidenceComparisonInput {
  beforeImages: string[];
  afterImages: string[];
  problemDescription: string;
  category: string;
}

export interface EvidenceComparisonOutput {
  sameLocationLikelihood: number;
  visibleChange: boolean;
  originalIssueStillDetected: boolean;
  resolutionConfidence: number;
  comparisonSummary: string;
  isDemo: boolean;
}

export interface CivicQueryInput {
  query: string;
  contextData: any;
}

export interface CivicQueryOutput {
  answer: string;
  citations: string[];
  isSufficientData: boolean;
}

export interface AIProvider {
  name: string;
  analyzeReport(input: AIReportInput): Promise<AIAnalysisOutput>;
  compareEvidence(input: EvidenceComparisonInput): Promise<EvidenceComparisonOutput>;
  answerCivicQuery(input: CivicQueryInput): Promise<CivicQueryOutput>;
}
