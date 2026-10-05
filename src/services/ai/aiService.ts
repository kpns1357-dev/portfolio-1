import {
  AIProvider,
  AIReportInput,
  AIAnalysisOutput,
  EvidenceComparisonInput,
  EvidenceComparisonOutput,
  CivicQueryInput,
  CivicQueryOutput,
} from "./types";
import { LocalCivicAIProvider } from "./localProvider";
import {
  aiAnalysisOutputSchema,
  aiCompareOutputSchema,
  aiAskOutputSchema,
} from "@/lib/schemas/ai.schema";

export function sanitizeUserInput(input: string, maxLen = 2000): string {
  if (!input) return "";
  // Strip control characters, keeping safe newlines and carriage returns
  const clean = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  return clean.slice(0, maxLen);
}

export function boundUntrustedPrompt(input: string): string {
  const sanitized = sanitizeUserInput(input);
  return `"""USER INPUT START"""\n${sanitized}\n"""USER INPUT END"""`;
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /you\s+are\s+now\s+a/i,
  /system\s+prompt/i,
  /drop\s+table/i,
  /select\s+.*\s+from/i,
  /<script[\s\S]*?>/i,
  /javascript:/i,
];

export function hasInjectionAttempt(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

class AIService {
  private currentProvider: AIProvider;

  constructor() {
    this.currentProvider = new LocalCivicAIProvider();
  }

  setProvider(provider: AIProvider) {
    this.currentProvider = provider;
  }

  getProviderName(): string {
    return this.currentProvider.name;
  }

  async analyzeReport(input: AIReportInput): Promise<AIAnalysisOutput> {
    const cleanDescription = sanitizeUserInput(input.description || "");

    // Guard against prompt injection
    const containsInjection = hasInjectionAttempt(cleanDescription);
    const sanitizedInput: AIReportInput = {
      ...input,
      description: containsInjection
        ? `[Neutralized input - Security Warning] ${cleanDescription.replace(
            /(ignore|previous|instructions|system prompt)/gi,
            "[blocked]"
          )}`
        : cleanDescription,
    };

    let result: AIAnalysisOutput;
    try {
      result = await this.currentProvider.analyzeReport(sanitizedInput);
    } catch (err) {
      console.error("[AIService] analyzeReport failed, falling back to local engine:", err);
      const fallback = new LocalCivicAIProvider();
      result = await fallback.analyzeReport(sanitizedInput);
    }

    // Validate structured output
    const validated = aiAnalysisOutputSchema.safeParse(result);
    if (!validated.success) {
      console.warn("[AIService] Output validation anomaly, using safe fallback:", validated.error);
      const fallback = new LocalCivicAIProvider();
      return fallback.analyzeReport(sanitizedInput);
    }

    return validated.data;
  }

  async compareEvidence(input: EvidenceComparisonInput): Promise<EvidenceComparisonOutput> {
    const sanitizedInput: EvidenceComparisonInput = {
      ...input,
      problemDescription: sanitizeUserInput(input.problemDescription || ""),
      category: sanitizeUserInput(input.category || "", 100),
    };

    let result: EvidenceComparisonOutput;
    try {
      result = await this.currentProvider.compareEvidence(sanitizedInput);
    } catch (err) {
      console.error("[AIService] compareEvidence failed, falling back:", err);
      const fallback = new LocalCivicAIProvider();
      result = await fallback.compareEvidence(sanitizedInput);
    }

    const validated = aiCompareOutputSchema.safeParse(result);
    if (!validated.success) {
      console.warn("[AIService] Comparison output validation anomaly:", validated.error);
      const fallback = new LocalCivicAIProvider();
      return fallback.compareEvidence(sanitizedInput);
    }

    return validated.data;
  }

  async answerCivicQuery(input: CivicQueryInput): Promise<CivicQueryOutput> {
    const cleanQuery = sanitizeUserInput(input.query, 1000);
    const sanitizedInput: CivicQueryInput = {
      ...input,
      query: cleanQuery,
    };

    let result: CivicQueryOutput;
    try {
      result = await this.currentProvider.answerCivicQuery(sanitizedInput);
    } catch (err) {
      console.error("[AIService] answerCivicQuery failed, falling back:", err);
      const fallback = new LocalCivicAIProvider();
      result = await fallback.answerCivicQuery(sanitizedInput);
    }

    const validated = aiAskOutputSchema.safeParse(result);
    if (!validated.success) {
      console.warn("[AIService] Query output validation anomaly:", validated.error);
      return {
        answer: "Data telemetry could not be verified. Please retry your civic query.",
        citations: [],
        isSufficientData: false,
      };
    }

    return validated.data;
  }
}

export const aiService = new AIService();
