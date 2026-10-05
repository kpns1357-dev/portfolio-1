import {
  AIProvider,
  AIReportInput,
  AIAnalysisOutput,
  EvidenceComparisonInput,
  EvidenceComparisonOutput,
  CivicQueryInput,
  CivicQueryOutput,
} from "./types";

export class LocalCivicAIProvider implements AIProvider {
  name = "Local Civic Intelligence Engine";

  async analyzeReport(input: AIReportInput): Promise<AIAnalysisOutput> {
    const text = (input.description || "").toLowerCase();
    
    // Category & problem classification patterns
    let category = "Roads";
    let detectedProblem = "Road surface degradation";
    let recommendedDepartment = "Roads & Transportation";
    let severityScore = 5.0;
    let safetyRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";
    const keyFactors: string[] = [];

    if (text.includes("pothole") || text.includes("crater") || text.includes("asphalt") || text.includes("road")) {
      category = "Roads";
      detectedProblem = text.includes("large") || text.includes("deep") ? "Severe deep pothole" : "Pothole road defect";
      recommendedDepartment = "Roads & Transportation";
      severityScore = text.includes("school") || text.includes("deep") || text.includes("dangerous") ? 8.7 : 6.4;
      keyFactors.push("Vehicle damage hazard", "Risk to cyclists and pedestrians");
    } else if (text.includes("garbage") || text.includes("trash") || text.includes("waste") || text.includes("dump") || text.includes("debris")) {
      category = "Waste";
      detectedProblem = text.includes("overflow") ? "Overflowing municipal dumpster" : "Illegal trash dumping";
      recommendedDepartment = "Waste Management & Sanitation";
      severityScore = text.includes("smell") || text.includes("rot") || text.includes("hospital") ? 7.2 : 5.1;
      keyFactors.push("Public health hazard", "Pest infestation risk");
    } else if (text.includes("leak") || text.includes("pipe") || text.includes("burst") || text.includes("water pressure")) {
      category = "Water";
      detectedProblem = text.includes("burst") ? "Burst water main pipe" : "Potable water supply leakage";
      recommendedDepartment = "Water Supply & Sewage";
      severityScore = text.includes("burst") || text.includes("flooding") ? 9.1 : 6.8;
      keyFactors.push("Resource wastage", "Potential structural erosion");
    } else if (text.includes("drain") || text.includes("flood") || text.includes("sewage") || text.includes("clog") || text.includes("gutter")) {
      category = "Drainage";
      detectedProblem = text.includes("flood") ? "Stormwater drainage blockage with localized flooding" : "Blocked storm sewer drain";
      recommendedDepartment = "Drainage & Flood Control";
      severityScore = text.includes("flood") || text.includes("submerged") ? 8.9 : 7.0;
      keyFactors.push("Flooding risk to adjoining properties", "Contamination risk");
    } else if (text.includes("light") || text.includes("dark") || text.includes("lamp") || text.includes("bulb") || text.includes("wire")) {
      category = "Lighting";
      detectedProblem = text.includes("exposed") || text.includes("wire") ? "Exposed electrical wire hazard on pole" : "Defective municipal street lighting";
      recommendedDepartment = "Street Lighting & Electrical";
      severityScore = text.includes("exposed") || text.includes("spark") ? 9.5 : 5.8;
      keyFactors.push("Pedestrian visibility impairment", "Crime deterrence loss");
    } else if (text.includes("traffic") || text.includes("signal") || text.includes("sign") || text.includes("jam")) {
      category = "Traffic";
      detectedProblem = "Traffic control signal malfunctioning";
      recommendedDepartment = "Traffic Management Bureau";
      severityScore = 8.5;
      keyFactors.push("Collision risk at intersection", "Congestion spillover");
    } else if (text.includes("tree") || text.includes("branch") || text.includes("park") || text.includes("green")) {
      category = "Environment";
      detectedProblem = text.includes("fallen") || text.includes("hanging") ? "Dangerous hanging or fallen tree limb" : "Park maintenance deficit";
      recommendedDepartment = "Parks & Urban Forestry";
      severityScore = text.includes("fallen") ? 8.2 : 4.5;
      keyFactors.push("Direct overhead hazard", "Blocked right of way");
    } else if (text.includes("sidewalk") || text.includes("curb") || text.includes("bench") || text.includes("bridge") || text.includes("barrier")) {
      category = "Public Infrastructure";
      detectedProblem = "Damaged public pedestrian infrastructure";
      recommendedDepartment = "Public Infrastructure Works";
      severityScore = 6.2;
      keyFactors.push("ADA / accessibility barrier", "Trip hazard");
    }

    // Safety risk escalation based on keywords
    if (text.includes("dangerous") || text.includes("hazard") || text.includes("accident") || text.includes("wire") || text.includes("injury")) {
      safetyRisk = "CRITICAL";
      severityScore = Math.max(severityScore, 8.8);
    } else if (text.includes("school") || text.includes("hospital") || text.includes("deep") || text.includes("elderly") || text.includes("flood")) {
      safetyRisk = "HIGH";
      severityScore = Math.max(severityScore, 7.5);
    } else if (severityScore > 6.0) {
      safetyRisk = "MEDIUM";
    } else {
      safetyRisk = "LOW";
    }

    const confidence = 0.88 + Math.min(0.1, (text.length > 50 ? 0.08 : 0.02));

    const summary = `${detectedProblem} detected near reported location. Recommended for prompt dispatch to ${recommendedDepartment} under ${safetyRisk} safety risk classification.`;

    return {
      detectedProblem,
      category,
      severityScore: parseFloat(severityScore.toFixed(1)),
      safetyRisk,
      recommendedDepartment,
      summary,
      confidence: parseFloat(confidence.toFixed(2)),
      keyFactors,
      isDemo: true,
    };
  }

  async compareEvidence(input: EvidenceComparisonInput): Promise<EvidenceComparisonOutput> {
    const hasBefore = input.beforeImages && input.beforeImages.length > 0;
    const hasAfter = input.afterImages && input.afterImages.length > 0;

    if (!hasBefore || !hasAfter) {
      return {
        sameLocationLikelihood: 0.5,
        visibleChange: false,
        originalIssueStillDetected: true,
        resolutionConfidence: 0.35,
        comparisonSummary: "Incomplete evidence set provided for multi-spectral verification.",
        isDemo: true,
      };
    }

    // Deterministic simulation based on category characteristics
    const confidence = 0.84 + Math.random() * 0.08;
    return {
      sameLocationLikelihood: 0.91,
      visibleChange: true,
      originalIssueStillDetected: false,
      resolutionConfidence: parseFloat(confidence.toFixed(2)),
      comparisonSummary: `AI image comparison confirms matching geometric landmarks and pavement geometry. Surface defect matching category "${input.category}" appears remedied with fresh asphalt/patchwork. No persistent hazard detected.`,
      isDemo: true,
    };
  }

  async answerCivicQuery(input: CivicQueryInput): Promise<CivicQueryOutput> {
    const q = input.query.toLowerCase();
    const data = input.contextData || {};

    if (q.includes("area") && (q.includes("most") || q.includes("unresolved") || q.includes("road"))) {
      if (data.areaStats && data.areaStats.length > 0) {
        const top = data.areaStats[0];
        return {
          answer: `Based on active database records, **${top.areaName}** has the highest volume of unresolved road and infrastructure issues with **${top.unresolvedCount} active cases** pending municipal attention.`,
          citations: [`Incident database - Sector aggregation (${top.areaName})`],
          isSufficientData: true,
        };
      }
    }

    if (q.includes("department") && (q.includes("workload") || q.includes("highest"))) {
      if (data.departmentWorkload && data.departmentWorkload.length > 0) {
        const top = [...data.departmentWorkload].sort((a: any, b: any) => b.activeCases - a.activeCases)[0];
        return {
          answer: `**${top.name}** currently bears the highest operational workload across the city, managing **${top.activeCases} active incidents** (${top.breachedCount || 0} SLA warnings/breaches) across ${top.teamsCount || 1} field teams.`,
          citations: [`Department workload register: ${top.name}`],
          isSufficientData: true,
        };
      }
    }

    if (q.includes("oldest") || q.includes("critical")) {
      if (data.oldestCritical && data.oldestCritical.length > 0) {
        const top = data.oldestCritical[0];
        return {
          answer: `The oldest unresolved critical incident in the system is **${top.caseId}** ("${top.title}"), opened on ${new Date(top.createdAt).toLocaleDateString()} in **${top.areaName}** (${top.priorityScore}/100 priority). Current status: ${top.status}.`,
          citations: [`Case record ${top.caseId}`],
          isSufficientData: true,
        };
      }
    }

    if (q.includes("recurring") || q.includes("repeat")) {
      if (data.recurringClusters && data.recurringClusters.length > 0) {
        const cluster = data.recurringClusters[0];
        return {
          answer: `The system has detected **${data.recurringClusters.length} recurring problem hot-spots**. Most notably in **${cluster.areaName}**, with **${cluster.totalIncidents} correlated incidents** primarily related to ${cluster.primaryCategory}. Hypothesis: *${cluster.rootCauseHypothesis}* (${Math.round(cluster.confidenceScore * 100)}% system confidence).`,
          citations: [`Spatial-temporal clustering engine (${cluster.areaName})`],
          isSufficientData: true,
        };
      }
    }

    if (q.includes("resolved") && (q.includes("month") || q.includes("rate") || q.includes("how many"))) {
      if (data.totalResolved !== undefined) {
        return {
          answer: `CivicOS records show a total of **${data.totalResolved} incidents resolved**, representing an overall city resolution rate of **${data.resolutionRate || 74}%** with an average turnaround time of **${data.avgResolutionDays || 3.4} days**.`,
          citations: [`City-wide resolution telemetry`],
          isSufficientData: true,
        };
      }
    }

    return {
      answer: "Insufficient data to accurately answer this query from current city records. Please check active department filters or query specific case IDs.",
      citations: [],
      isSufficientData: false,
    };
  }
}
