"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  Shield,
  Layers,
  Flag,
} from "lucide-react";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";

export default function ModerationQueuePage() {
  const [data, setData] = useState<{
    flaggedReports: any[];
    pendingIncidents: any[];
    duplicateCandidates: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/moderation/queue");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleAction = async (action: "APPROVE" | "REJECT", incidentId?: string, reportId?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/moderation/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          incidentId,
          reportId,
          reason: action === "APPROVE" ? "Verified authentic civic defect" : "Failed moderation criteria",
        }),
      });
      if (res.ok) {
        await loadQueue();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMerge = async (reportId: string, targetIncidentId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/duplicates/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          targetIncidentId,
          reason: "Moderator merged verified duplicate report into target incident.",
        }),
      });
      if (res.ok) {
        await loadQueue();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400 font-medium">
          Loading moderation verification queue...
        </p>
      </div>
    );
  }

  const { flaggedReports = [], pendingIncidents = [], duplicateCandidates = [] } = data || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
          Quality Control & Integrity
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Moderation & Duplicate Merge Panel
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review suspicious submissions, verify authentic citizen reports, and merge duplicate incidents.
        </p>
      </div>

      {/* 1. DUPLICATE MERGE CANDIDATES */}
      <div className="rounded-2xl border border-amber-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-amber-100 bg-amber-50/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Copy className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Duplicate Merge Recommendations ({duplicateCandidates.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            AI spatial & text overlap detection
          </span>
        </div>

        {duplicateCandidates.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No pending duplicate merge recommendations.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {duplicateCandidates.map((dup: any) => (
              <div
                key={dup.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-blue-600">
                      {dup.report.trackingCode}
                    </span>
                    <span className="text-slate-400">→ merging into →</span>
                    <span className="font-mono font-bold text-indigo-700">
                      {dup.potentialIncident.caseId}
                    </span>
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                      {Math.round(dup.similarityScore * 100)}% Match
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      ({dup.distanceMeters}m distance)
                    </span>
                  </div>

                  <p className="font-semibold text-slate-900">{dup.report.title}</p>
                  <p className="text-slate-500 line-clamp-1">{dup.report.description}</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleMerge(dup.reportId, dup.potentialIncidentId)}
                    disabled={actionLoading}
                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
                  >
                    Confirm Merge
                  </button>
                  <Link
                    href={`/incidents/${dup.potentialIncident.caseId}`}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors"
                  >
                    Inspect
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. UNVERIFIED / REPORTED CASES REQUIRING MODERATION */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Pending First-Stage Verification ({pendingIncidents.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            New reports awaiting moderation confirmation
          </span>
        </div>

        {pendingIncidents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            All submitted cases have been verified!
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {pendingIncidents.map((inc: any) => (
              <div
                key={inc.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-blue-600">{inc.caseId}</span>
                    <PriorityBadge score={inc.priorityScore} label={inc.priorityLabel} size="sm" />
                    <StatusBadge status={inc.status} size="sm" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{inc.title}</h4>
                  <p className="text-slate-500 line-clamp-1">{inc.address}</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleAction("APPROVE", inc.id)}
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Route
                  </button>

                  <button
                    onClick={() => handleAction("REJECT", inc.id)}
                    disabled={actionLoading}
                    className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>

                  <Link
                    href={`/incidents/${inc.caseId}`}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. FLAGGED / SUSPICIOUS REPORTS */}
      {flaggedReports.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-white shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-rose-100 bg-rose-50/40 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flag className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Flagged Suspicious Reports ({flaggedReports.length})
              </h3>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {flaggedReports.map((rep: any) => (
              <div
                key={rep.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-800">{rep.trackingCode}</span>
                    <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                      Flag: {rep.moderationFlag}
                    </span>
                    <span className="text-slate-400">
                      Reporter Reliability: {Math.round((rep.citizen?.reliabilityScore || 0.8) * 100)}%
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900">{rep.title}</p>
                  <p className="text-slate-500 line-clamp-1">{rep.description}</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleAction("REJECT", undefined, rep.id)}
                    disabled={actionLoading}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs"
                  >
                    Dismiss as Spam
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
