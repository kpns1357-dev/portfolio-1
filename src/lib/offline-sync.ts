import { openDB, DBSchema, IDBPDatabase } from "idb";

export interface OfflineReport {
  localId: string;
  title: string;
  description: string;
  categoryId: string;
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  anonymity: string;
  evidenceBase64: string[];
  createdAt: string;
  syncStatus: "PENDING" | "SYNCING" | "FAILED" | "SYNCED";
  errorMessage?: string;
  serverTrackingCode?: string;
}

interface CivicOSDB extends DBSchema {
  offlineReports: {
    key: string;
    value: OfflineReport;
    indexes: { "by-status": string };
  };
}

const DB_NAME = "civicos_offline_db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CivicOSDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB<CivicOSDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("offlineReports", { keyPath: "localId" });
        store.createIndex("by-status", "syncStatus");
      },
    });
  }
  return dbPromise;
}

export async function saveOfflineReport(report: Omit<OfflineReport, "localId" | "createdAt" | "syncStatus">): Promise<OfflineReport> {
  const db = await getDB();
  const offlineItem: OfflineReport = {
    ...report,
    localId: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    syncStatus: "PENDING",
  };

  if (db) {
    await db.put("offlineReports", offlineItem);
  }
  return offlineItem;
}

export async function getPendingOfflineReports(): Promise<OfflineReport[]> {
  const db = await getDB();
  if (!db) return [];
  return (await db.getAll("offlineReports")).filter((r) => r.syncStatus !== "SYNCED");
}

export async function getAllOfflineReports(): Promise<OfflineReport[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAll("offlineReports");
}

export async function deleteOfflineReport(localId: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete("offlineReports", localId);
}

export async function syncOfflineReport(localId: string): Promise<{ success: boolean; trackingCode?: string; error?: string }> {
  const db = await getDB();
  if (!db) return { success: false, error: "Database unavailable" };

  const report = await db.get("offlineReports", localId);
  if (!report) return { success: false, error: "Report not found in offline storage" };

  try {
    report.syncStatus = "SYNCING";
    await db.put("offlineReports", report);

    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: report.title,
        description: report.description,
        categoryId: report.categoryId,
        latitude: report.latitude,
        longitude: report.longitude,
        address: report.address,
        landmark: report.landmark,
        anonymity: report.anonymity,
        evidenceUrls: report.evidenceBase64,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      report.syncStatus = "FAILED";
      report.errorMessage = data.error || "Server rejected report synchronization";
      await db.put("offlineReports", report);
      return { success: false, error: report.errorMessage };
    }

    report.syncStatus = "SYNCED";
    report.serverTrackingCode = data.report.trackingCode;
    await db.put("offlineReports", report);

    return { success: true, trackingCode: data.report.trackingCode };
  } catch (err: any) {
    report.syncStatus = "FAILED";
    report.errorMessage = err.message || "Network synchronization failed";
    await db.put("offlineReports", report);
    return { success: false, error: report.errorMessage };
  }
}
