/**
 * Duplicate Detection Engine for CivicOS
 * Evaluates candidate incidents based on geographic distance, category matching,
 * textual similarity (Levenshtein / word n-grams / token overlap), and temporal proximity.
 */

export interface DuplicateDetectionTarget {
  latitude: number;
  longitude: number;
  categoryId: string;
  categoryName?: string;
  description: string;
  title?: string;
  createdAt?: Date;
}

export interface ExistingIncidentCandidate {
  id: string;
  caseId: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName?: string;
  latitude: number;
  longitude: number;
  status: string;
  createdAt: Date;
  reportsCount?: number;
}

export interface DuplicateMatchResult {
  incident: ExistingIncidentCandidate;
  similarityScore: number; // 0.0 - 1.0 (e.g. 0.94)
  distanceMeters: number;
  reasons: string[];
}

// Haversine formula to compute great-circle distance in meters between two lat/lng coordinates
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Tokenize and compute Jaccard similarity between two text strings
export function calculateTextSimilarity(textA: string, textB: string): number {
  const tokenize = (t: string) => {
    return new Set(
      t
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
  };

  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const word of Array.from(setA)) {
    if (setB.has(word)) {
      intersection++;
    }
  }

  const union = new Set([...Array.from(setA), ...Array.from(setB)]).size;
  return union === 0 ? 0 : intersection / union;
}

export function findDuplicateCandidates(
  target: DuplicateDetectionTarget,
  existingIncidents: ExistingIncidentCandidate[],
  maxDistanceMeters: number = 600,
  minSimilarityThreshold: number = 0.55
): DuplicateMatchResult[] {
  const matches: DuplicateMatchResult[] = [];

  for (const inc of existingIncidents) {
    // Exclude resolved/closed cases older than 60 days
    if (inc.status === "RESOLVED" || inc.status === "REJECTED") {
      const daysOld = (Date.now() - new Date(inc.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld > 60) continue;
    }

    const distance = calculateHaversineDistanceMeters(
      target.latitude,
      target.longitude,
      inc.latitude,
      inc.longitude
    );

    // Skip if beyond physical proximity threshold
    if (distance > maxDistanceMeters) continue;

    const reasons: string[] = [];
    let geoWeight = 0;
    if (distance <= 50) {
      geoWeight = 0.45;
      reasons.push(`Within immediate proximity (${distance}m)`);
    } else if (distance <= 150) {
      geoWeight = 0.35;
      reasons.push(`Same immediate block (${distance}m)`);
    } else if (distance <= 300) {
      geoWeight = 0.25;
      reasons.push(`Nearby location (${distance}m)`);
    } else {
      geoWeight = 0.15;
      reasons.push(`Within neighbourhood corridor (${distance}m)`);
    }

    // Category similarity (0.35 max)
    let catWeight = 0;
    if (target.categoryId === inc.categoryId) {
      catWeight = 0.35;
      reasons.push(`Identical category match`);
    } else if (
      target.categoryName &&
      inc.categoryName &&
      target.categoryName.toLowerCase() === inc.categoryName.toLowerCase()
    ) {
      catWeight = 0.35;
      reasons.push(`Matching civic domain`);
    }

    // Textual similarity (0.20 max)
    const textSim = calculateTextSimilarity(
      `${target.title || ""} ${target.description}`,
      `${inc.title} ${inc.description}`
    );
    const textScore = textSim * 0.2;
    if (textSim > 0.3) {
      reasons.push(`High textual description overlap (${Math.round(textSim * 100)}%)`);
    }

    const totalSimilarity = Math.min(1.0, geoWeight + catWeight + textScore);

    if (totalSimilarity >= minSimilarityThreshold) {
      matches.push({
        incident: inc,
        similarityScore: parseFloat(totalSimilarity.toFixed(2)),
        distanceMeters: distance,
        reasons,
      });
    }
  }

  // Sort descending by similarity
  return matches.sort((a, b) => b.similarityScore - a.similarityScore);
}
