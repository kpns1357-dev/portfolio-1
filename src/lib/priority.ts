import { PriorityBreakdown, PriorityLevel } from "./types";

export interface PriorityWeights {
  maxSeverity: number;     // default 30
  maxSafety: number;       // default 25
  maxMultiple: number;     // default 12
  maxTraffic: number;      // default 8
  maxDuration: number;     // default 7
  maxRecurrence: number;   // default 5
  baseScore: number;       // default 13 (to allow full range 0-100)
}

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  maxSeverity: 30,
  maxSafety: 25,
  maxMultiple: 12,
  maxTraffic: 8,
  maxDuration: 7,
  maxRecurrence: 5,
  baseScore: 13,
};

export interface PriorityCalculationInput {
  severityScore: number; // 0.0 - 10.0
  safetyRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reportsCount: number; // 1 or more
  isRecurring?: boolean;
  hoursElapsed?: number;
  trafficLevel?: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  weights?: Partial<PriorityWeights>;
}

export function calculatePriorityScore(input: PriorityCalculationInput): PriorityBreakdown {
  const w: PriorityWeights = { ...DEFAULT_PRIORITY_WEIGHTS, ...(input.weights || {}) };

  // 1. Severity contribution (0 to maxSeverity)
  // severityScore is 0-10
  const normSeverity = Math.min(10, Math.max(0, input.severityScore));
  const severityScore = Math.round((normSeverity / 10) * w.maxSeverity);

  // 2. Safety Risk contribution (0 to maxSafety)
  let safetyScore = 0;
  switch (input.safetyRisk) {
    case "CRITICAL":
      safetyScore = w.maxSafety;
      break;
    case "HIGH":
      safetyScore = Math.round(w.maxSafety * 0.75);
      break;
    case "MEDIUM":
      safetyScore = Math.round(w.maxSafety * 0.45);
      break;
    case "LOW":
    default:
      safetyScore = Math.round(w.maxSafety * 0.15);
      break;
  }

  // 3. Multiple reports contribution (0 to maxMultiple)
  // 1 report -> 0 pts, 2 reports -> 5 pts, 3 -> 8 pts, 5+ -> max
  const count = Math.max(1, input.reportsCount);
  let multipleReportsScore = 0;
  if (count > 1) {
    const ratio = Math.min(1, (count - 1) / 4);
    multipleReportsScore = Math.round(ratio * w.maxMultiple);
  }

  // 4. Traffic exposure (0 to maxTraffic)
  let trafficScore = Math.round(w.maxTraffic * 0.5); // default medium
  if (input.trafficLevel === "VERY_HIGH") {
    trafficScore = w.maxTraffic;
  } else if (input.trafficLevel === "HIGH") {
    trafficScore = Math.round(w.maxTraffic * 0.8);
  } else if (input.trafficLevel === "LOW") {
    trafficScore = Math.round(w.maxTraffic * 0.2);
  }

  // 5. Duration (0 to maxDuration)
  // Longer unresolved issues get an escalation bump
  const hours = input.hoursElapsed || 0;
  let durationScore = 0;
  if (hours > 72) {
    durationScore = w.maxDuration;
  } else if (hours > 24) {
    durationScore = Math.round(w.maxDuration * 0.6);
  } else if (hours > 6) {
    durationScore = Math.round(w.maxDuration * 0.3);
  }

  // 6. Recurrence (0 to maxRecurrence)
  const recurrenceScore = input.isRecurring ? w.maxRecurrence : 0;

  const rawTotal =
    severityScore +
    safetyScore +
    multipleReportsScore +
    trafficScore +
    durationScore +
    recurrenceScore;

  const totalScore = Math.min(100, Math.max(0, rawTotal));

  const explanation: Record<string, string> = {
    severity: `Severity (${input.severityScore.toFixed(1)}/10): +${severityScore}`,
    safety: `Safety risk (${input.safetyRisk}): +${safetyScore}`,
    multipleReports: `Report volume (${count} ${count === 1 ? "report" : "reports"}): +${multipleReportsScore}`,
    traffic: `Traffic exposure (${input.trafficLevel || "MEDIUM"}): +${trafficScore}`,
    duration: `Time elapsed (${hours}h): +${durationScore}`,
    recurrence: `Recurrence signal (${input.isRecurring ? "Detected" : "None"}): +${recurrenceScore}`,
  };

  return {
    severityScore,
    safetyScore,
    multipleReportsScore,
    trafficScore,
    durationScore,
    recurrenceScore,
    totalScore,
    explanation,
  };
}

export function getPriorityLabel(score: number): PriorityLevel {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}
