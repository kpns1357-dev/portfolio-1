"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { getPendingOfflineReports, syncOfflineReport, OfflineReport } from "@/lib/offline-sync";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingReports, setPendingReports] = useState<OfflineReport[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const checkPending = async () => {
    try {
      const reports = await getPendingOfflineReports();
      setPendingReports(reports);
    } catch {
      // IndexedDB not ready
    }
  };

  const handleSyncAll = async () => {
    if (isSyncing || pendingReports.length === 0) return;
    setIsSyncing(true);
    setSyncFeedback(null);

    let successCount = 0;
    for (const report of pendingReports) {
      const res = await syncOfflineReport(report.localId);
      if (res.success) {
        successCount++;
      }
    }

    await checkPending();
    setIsSyncing(false);
    if (successCount > 0) {
      setSyncFeedback(`Successfully synchronized ${successCount} offline report${successCount > 1 ? "s" : ""}!`);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const onOnline = () => {
      setIsOnline(true);
      handleSyncAll();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    checkPending();
    const interval = setInterval(checkPending, 8000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
  }, []);

  if (isOnline && pendingReports.length === 0 && !syncFeedback) {
    return null;
  }

  return (
    <div className="bg-slate-900 text-white px-4 py-2 text-xs border-b border-slate-800 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          {!isOnline ? (
            <>
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span className="font-semibold text-amber-300">OFFLINE MODE:</span>
              <span className="text-slate-300 hidden sm:inline">
                You can still create reports. They will be saved to your device and synchronized when reconnected.
              </span>
              <span className="text-slate-300 sm:hidden">
                Offline. Reports will save locally.
              </span>
            </>
          ) : syncFeedback ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-emerald-300">{syncFeedback}</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-slate-200">
                You have <strong>{pendingReports.length}</strong> unsynchronized local report{pendingReports.length > 1 ? "s" : ""}.
              </span>
            </>
          )}
        </div>

        {pendingReports.length > 0 && isOnline && (
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2.5 py-1 rounded text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Synchronizing..." : "Sync Reports Now"}
          </button>
        )}
      </div>
    </div>
  );
}
