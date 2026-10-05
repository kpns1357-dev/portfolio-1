import { describe, it, expect } from "vitest";
import {
  calculatePriorityScore,
  getPriorityLabel,
  DEFAULT_PRIORITY_WEIGHTS,
} from "../src/lib/priority";
import {
  calculateSlaDeadline,
  evaluateSla,
  DEFAULT_SLA_DURATIONS,
} from "../src/lib/sla";
import {
  calculateHaversineDistanceMeters,
  calculateTextSimilarity,
  findDuplicateCandidates,
} from "../src/lib/duplicates";
import { detectRecurringClusters } from "../src/lib/recurring";
import { requireRole } from "../src/lib/auth";

describe("1. Deterministic Priority Engine", () => {
  it("calculates correct score for severe hazard with multiple reports", () => {
    const breakdown = calculatePriorityScore({
      severityScore: 8.7,
      safetyRisk: "HIGH",
      reportsCount: 4,
      trafficLevel: "HIGH",
      isRecurring: true,
      hoursElapsed: 30,
    });

    expect(breakdown.totalScore).toBeGreaterThanOrEqual(60);
    expect(breakdown.severityScore).toBe(Math.round((8.7 / 10) * DEFAULT_PRIORITY_WEIGHTS.maxSeverity));
    expect(breakdown.safetyScore).toBe(Math.round(DEFAULT_PRIORITY_WEIGHTS.maxSafety * 0.75));
    expect(breakdown.recurrenceScore).toBe(DEFAULT_PRIORITY_WEIGHTS.maxRecurrence);
    expect(breakdown.explanation.severity).toBeDefined();
    expect(breakdown.explanation.safety).toBeDefined();
  });

  it("assigns CRITICAL priority label when score >= 75", () => {
    const breakdown = calculatePriorityScore({
      severityScore: 10.0,
      safetyRisk: "CRITICAL",
      reportsCount: 5,
      trafficLevel: "VERY_HIGH",
      isRecurring: true,
      hoursElapsed: 80,
    });

    const label = getPriorityLabel(breakdown.totalScore);
    expect(label).toBe("CRITICAL");
    expect(breakdown.totalScore).toBeGreaterThanOrEqual(75);
  });

  it("assigns LOW priority for minor cosmetic issues", () => {
    const breakdown = calculatePriorityScore({
      severityScore: 2.0,
      safetyRisk: "LOW",
      reportsCount: 1,
      trafficLevel: "LOW",
      isRecurring: false,
      hoursElapsed: 1,
    });

    const label = getPriorityLabel(breakdown.totalScore);
    expect(["LOW", "MEDIUM"]).toContain(label);
    expect(breakdown.totalScore).toBeLessThan(35);
  });
});

describe("2. SLA Calculation & Breach Evaluation", () => {
  it("computes accurate deadlines based on priority tier", () => {
    const now = new Date("2026-10-01T10:00:00Z");
    const criticalDeadline = calculateSlaDeadline(now, "CRITICAL");
    const highDeadline = calculateSlaDeadline(now, "HIGH");

    // Critical is 24 hours later
    expect(criticalDeadline.getTime() - now.getTime()).toBe(24 * 3600 * 1000);
    // High is 72 hours later
    expect(highDeadline.getTime() - now.getTime()).toBe(72 * 3600 * 1000);
  });

  it("detects SLA BREACHED status when current time exceeds deadline", () => {
    const deadline = new Date("2026-10-01T10:00:00Z");
    const now = new Date("2026-10-01T14:00:00Z"); // 4 hours late

    const evaluation = evaluateSla(deadline, now);
    expect(evaluation.isBreached).toBe(true);
    expect(evaluation.slaStatus).toBe("BREACHED");
    expect(evaluation.statusText).toContain("SLA BREACHED");
  });

  it("flags SLA WARNING when under 12 hours remaining", () => {
    const deadline = new Date("2026-10-01T18:00:00Z");
    const now = new Date("2026-10-01T10:00:00Z"); // 8 hours remaining

    const evaluation = evaluateSla(deadline, now);
    expect(evaluation.isBreached).toBe(false);
    expect(evaluation.isWarning).toBe(true);
    expect(evaluation.slaStatus).toBe("WARNING");
    expect(evaluation.statusText).toContain("Due in 8 hours");
  });
});

describe("3. Duplicate Detection & Distance Engine", () => {
  it("calculates accurate haversine distance in meters", () => {
    // Two points roughly 100m apart in New York
    const dist = calculateHaversineDistanceMeters(40.7128, -74.0060, 40.7136, -74.0060);
    expect(dist).toBeGreaterThan(70);
    expect(dist).toBeLessThan(120);
  });

  it("computes text token overlap accurately", () => {
    const textA = "Large deep crater pothole outside elementary school gate";
    const textB = "Deep pothole crater near elementary school entrance";
    const sim = calculateTextSimilarity(textA, textB);
    expect(sim).toBeGreaterThan(0.4);
  });

  it("ranks immediate duplicate candidates higher than distant ones", () => {
    const target = {
      latitude: 40.7128,
      longitude: -74.0060,
      categoryId: "cat_roads",
      categoryName: "Roads",
      description: "Severe pothole damaging tires",
    };

    const candidates = [
      {
        id: "inc_1",
        caseId: "CF-2026-1",
        title: "Pothole damaging cars",
        description: "Deep pothole damaging vehicles",
        categoryId: "cat_roads",
        categoryName: "Roads",
        latitude: 40.7129, // 15m away
        longitude: -74.0060,
        status: "ASSIGNED",
        createdAt: new Date(),
      },
      {
        id: "inc_2",
        caseId: "CF-2026-2",
        title: "Waste pile in alley",
        description: "Trash bag dumped",
        categoryId: "cat_waste",
        categoryName: "Waste",
        latitude: 40.7180, // ~600m away
        longitude: -74.0060,
        status: "ASSIGNED",
        createdAt: new Date(),
      },
    ];

    const matches = findDuplicateCandidates(target, candidates, 800, 0.4);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].incident.caseId).toBe("CF-2026-1");
    expect(matches[0].similarityScore).toBeGreaterThan(0.7);
  });
});

describe("4. Recurring Problem Hot-Spot Engine", () => {
  it("detects spatial-temporal cluster when multiple incidents group nearby", () => {
    const testIncidents = [
      { id: "1", caseId: "CF-1", latitude: 40.7128, longitude: -74.0060, categoryName: "Roads", areaName: "Sector 4", title: "Pothole A", createdAt: new Date() },
      { id: "2", caseId: "CF-2", latitude: 40.7130, longitude: -74.0058, categoryName: "Drainage", areaName: "Sector 4", title: "Drain Flood B", createdAt: new Date() },
      { id: "3", caseId: "CF-3", latitude: 40.7125, longitude: -74.0062, categoryName: "Roads", areaName: "Sector 4", title: "Asphalt Collapse C", createdAt: new Date() },
      { id: "4", caseId: "CF-4", latitude: 40.7129, longitude: -74.0059, categoryName: "Drainage", areaName: "Sector 4", title: "Clogged Gully D", createdAt: new Date() },
    ];

    const clusters = detectRecurringClusters({ incidents: testIncidents, minIncidents: 3, clusterRadiusMeters: 400 });
    expect(clusters.length).toBe(1);
    expect(clusters[0].totalIncidents).toBe(4);
    expect(clusters[0].areaName).toBe("Sector 4");
    expect(clusters[0].rootCauseHypothesis).toContain("drainage");
    expect(clusters[0].confidenceScore).toBeGreaterThan(0.7);
  });
});

describe("5. Role-Based Permission Enforcement", () => {
  it("allows SUPER_ADMIN to perform any action", () => {
    const adminUser = {
      id: "u_admin",
      email: "admin@civicos.org",
      name: "Super Admin",
      role: "SUPER_ADMIN" as const,
      reliabilityScore: 1.0,
    };

    expect(requireRole(adminUser, ["AUTHORITY"])).toBe(true);
    expect(requireRole(adminUser, ["MODERATOR"])).toBe(true);
    expect(requireRole(adminUser, ["CITIZEN"])).toBe(true);
  });

  it("blocks CITIZEN from authority and moderator operations", () => {
    const citizenUser = {
      id: "u_citizen",
      email: "citizen@civicos.org",
      name: "Citizen",
      role: "CITIZEN" as const,
      reliabilityScore: 0.95,
    };

    expect(requireRole(citizenUser, ["AUTHORITY"])).toBe(false);
    expect(requireRole(citizenUser, ["MODERATOR"])).toBe(false);
    expect(requireRole(citizenUser, ["CITIZEN"])).toBe(true);
  });
});
