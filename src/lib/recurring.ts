import { calculateHaversineDistanceMeters } from "./duplicates";

export interface RecurringClusterDetectionInput {
  incidents: Array<{
    id: string;
    caseId: string;
    latitude: number;
    longitude: number;
    categoryName: string;
    areaName: string;
    title: string;
    createdAt: Date | string;
  }>;
  clusterRadiusMeters?: number; // default 500m
  minIncidents?: number;        // default 3
}

export interface DetectedCluster {
  title: string;
  areaName: string;
  primaryCategory: string;
  totalIncidents: number;
  categoryBreakdown: Record<string, number>;
  rootCauseHypothesis: string;
  confidenceScore: number;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  incidentIds: string[];
}

export function detectRecurringClusters(
  input: RecurringClusterDetectionInput
): DetectedCluster[] {
  const radius = input.clusterRadiusMeters || 450;
  const minIncidents = input.minIncidents || 3;
  const incidents = input.incidents;

  const visited = new Set<string>();
  const clusters: DetectedCluster[] = [];

  for (let i = 0; i < incidents.length; i++) {
    const incA = incidents[i];
    if (visited.has(incA.id)) continue;

    const clusterIncidents = [incA];
    visited.add(incA.id);

    for (let j = i + 1; j < incidents.length; j++) {
      const incB = incidents[j];
      if (visited.has(incB.id)) continue;

      const dist = calculateHaversineDistanceMeters(
        incA.latitude,
        incA.longitude,
        incB.latitude,
        incB.longitude
      );

      if (dist <= radius) {
        clusterIncidents.push(incB);
        visited.add(incB.id);
      }
    }

    if (clusterIncidents.length >= minIncidents) {
      // Aggregate stats
      const catCount: Record<string, number> = {};
      let sumLat = 0;
      let sumLng = 0;

      for (const item of clusterIncidents) {
        catCount[item.categoryName] = (catCount[item.categoryName] || 0) + 1;
        sumLat += item.latitude;
        sumLng += item.longitude;
      }

      const centerLat = sumLat / clusterIncidents.length;
      const centerLng = sumLng / clusterIncidents.length;

      // Find top categories
      const sortedCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
      const primaryCat = sortedCats[0][0];
      const hasDrainage = Boolean(catCount["Drainage"] || catCount["Water"]);
      const hasRoad = Boolean(catCount["Roads"] || catCount["Public Infrastructure"]);

      let hypothesis = `Recurring ${primaryCat} defect cluster detected.`;
      let confidence = 0.72;

      if (hasDrainage && hasRoad) {
        hypothesis = "Sub-surface drainage inadequacy leading to cyclical pavement foundation saturation and recurring asphalt collapse.";
        confidence = 0.84;
      } else if (primaryCat === "Waste") {
        hypothesis = "Insufficient municipal waste bin capacity or irregular collection schedule causing recurring localized overflow.";
        confidence = 0.79;
      } else if (primaryCat === "Lighting") {
        hypothesis = "Underground electrical circuit line faults or localized transformer surges triggering repeat luminaire burnout.";
        confidence = 0.81;
      } else if (primaryCat === "Water") {
        hypothesis = "Aging pressurized distribution conduit susceptible to recurring hydraulic water hammer ruptures.";
        confidence = 0.76;
      }

      clusters.push({
        title: `${incA.areaName} - Chronic ${primaryCat} Pattern`,
        areaName: incA.areaName,
        primaryCategory: primaryCat,
        totalIncidents: clusterIncidents.length,
        categoryBreakdown: catCount,
        rootCauseHypothesis: hypothesis,
        confidenceScore: confidence,
        centerLat,
        centerLng,
        radiusMeters: radius,
        incidentIds: clusterIncidents.map((c) => c.id),
      });
    }
  }

  return clusters.sort((a, b) => b.totalIncidents - a.totalIncidents);
}
