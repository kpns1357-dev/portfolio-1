"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { SlaBadge } from "@/components/SlaBadge";

export default function CitizenDashboardPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [userRes, reportsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/reports?mine=true"),
        ]);
        if (userRes.ok) {
          const u = await userRes.json();
          setUser(u.user);
        }
        if (reportsRes.ok) {
          const r = await reportsRes.json();
          setReports(r.reports || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalSubmitted = reports.length;
  const verifiedCount = reports.filter((r) => r.incident && r.incident.status !== "REPORTED").length;
  const resolvedCount = reports.filter((r) => r.incident?.status === "RESOLVED").length;
  const pendingVerificationCount = reports.filter((r) => r.incident?.status === "VERIFICATION_PENDING").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
            Citizen Case Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Civic Observations & Follow-ups
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as <strong>{user?.name || "Citizen"}</strong> ({user?.email || "citizen@civicos.org"}) · Reliability Score: {user?.reliabilityScore ? Math.round(user.reliabilityScore * 100) : 95}%
          </p>
        </div>

        <Link
          href="/report"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs w-fit"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Problem Report</span>
        </Link>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Reports Submitted
          </span>
          <span className="text-3xl font-black text-slate-900 mt-1 block">
            {totalSubmitted}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
            Moderator Verified
          </span>
          <span className="text-3xl font-black text-blue-600 mt-1 block">
            {verifiedCount}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">
            Needs Your Verification
          </span>
          <span className="text-3xl font-black text-amber-600 mt-1 block">
            {pendingVerificationCount}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
            Successfully Resolved
          </span>
          <span className="text-3xl font-black text-emerald-600 mt-1 block">
            {resolvedCount}
          </span>
        </div>
      </div>

      {/* PENDING VERIFICATION ALERT CARDS IF ANY */}
      {pendingVerificationCount > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-5 space-y-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wide">
              Action Required: Confirm Completed Repairs
            </h3>
          </div>
          <p className="text-xs text-amber-900">
            The municipal authority has uploaded completion evidence for your reported incidents. Please inspect and confirm whether the problem is genuinely fixed!
          </p>

          <div className="space-y-2">
            {reports
              .filter((r) => r.incident?.status === "VERIFICATION_PENDING")
              .map((rep) => (
                <div
                  key={rep.id}
                  className="bg-white p-3.5 rounded-xl border border-amber-200 flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-600">
                      {rep.incident?.caseId}
                    </span>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5">{rep.title}</p>
                    <span className="text-[11px] text-slate-500">{rep.address}</span>
                  </div>
                  <Link
                    href={`/incidents/${rep.incident?.caseId}`}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    Inspect & Sign Off <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* REPORTS LIST */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Your Observations History ({reports.length})
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Directly connected to municipal workflow
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading your reports...</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No reports submitted yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Notice a pothole, broken streetlight, or water leak in your neighbourhood? Submit your first report in under 2 minutes.
            </p>
            <Link
              href="/report"
              className="mt-3 inline-block bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold"
            >
              Report a Problem
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {rep.trackingCode}
                    </span>
                    {rep.incident && (
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                        Case: {rep.incident.caseId}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {new Date(rep.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">{rep.title}</h3>
                  <p className="text-slate-500 line-clamp-1">{rep.address}</p>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  {rep.incident && (
                    <>
                      <StatusBadge status={rep.incident.status} size="sm" />
                      <Link
                        href={`/incidents/${rep.incident.caseId}`}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      >
                        View Case <ExternalLink className="w-3 h-3" />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
