"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Building,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { AskCivicAi } from "@/components/AskCivicAi";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [recurring, setRecurring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, recRes] = await Promise.all([
          fetch("/api/analytics/stats"),
          fetch("/api/analytics/recurring"),
        ]);
        if (statsRes.ok) {
          const s = await statsRes.json();
          setStats(s);
        }
        if (recRes.ok) {
          const r = await recRes.json();
          setRecurring(r.clusters || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400 font-medium">
          Aggregating city-wide civic intelligence telemetry...
        </p>
      </div>
    );
  }

  const { summary, categories, departments, slaBreakdown, areaBreakdown, monthlyData } = stats;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
          Municipal Transparency & Operations
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          City Analytics & Public Performance
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Open data dashboard showing real municipal response times, department workloads, and chronic infrastructure hot-spots.
        </p>
      </div>

      {/* NATURAL LANGUAGE CIVIC AI ASSISTANT */}
      <AskCivicAi />

      {/* KPI METRICS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Annual Reports Logged
          </span>
          <span className="text-3xl font-black text-slate-900 mt-1 block">
            {summary.totalReports}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {summary.totalIncidents} active/closed incidents
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
            City Resolution Rate
          </span>
          <span className="text-3xl font-black text-emerald-600 mt-1 block">
            {summary.resolutionRate}%
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {summary.resolvedIncidents} cases verified complete
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
            Avg Turnaround Time
          </span>
          <span className="text-3xl font-black text-slate-900 mt-1 block">
            {summary.avgResolutionDays} days
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            From observation to citizen sign-off
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">
            Critical Active Incidents
          </span>
          <span className="text-3xl font-black text-rose-600 mt-1 block">
            {summary.criticalIncidents}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Requiring expedited field dispatch
          </span>
        </div>
      </div>

      {/* MONTHLY TELEMETRY & CATEGORY BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Monthly Trend Bars */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Monthly Submissions vs Resolutions
              </h3>
              <p className="text-[11px] text-slate-500">
                Tracking incoming citizen reports against completed repairs
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>

          <div className="space-y-3 pt-2">
            {monthlyData.map((m: any) => {
              const maxVal = 140;
              const repPct = Math.min(100, (m.reports / maxVal) * 100);
              const resPct = Math.min(100, (m.resolved / maxVal) * 100);

              return (
                <div key={m.month} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="font-bold text-slate-700 w-12">{m.month}</span>
                    <div className="flex space-x-3 text-[11px] font-mono">
                      <span className="text-blue-600">{m.reports} reported</span>
                      <span className="text-emerald-600">{m.resolved} resolved</span>
                    </div>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                    <div
                      className="bg-blue-500 h-full rounded-l-full transition-all"
                      style={{ width: `${repPct}%` }}
                    />
                    <div
                      className="bg-emerald-500 h-full rounded-r-full transition-all"
                      style={{ width: `${resPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 pt-3 text-xs text-slate-500 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500" /> Reports Submitted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" /> Repairs Confirmed
            </span>
          </div>
        </div>

        {/* SLA & Status Performance (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              SLA Compliance Telemetry
            </h3>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-950 block">Normal SLA Operating Window</span>
                <span className="text-[11px] text-emerald-800">Within standard turnaround deadlines</span>
              </div>
              <span className="text-lg font-mono font-bold text-emerald-700">
                {slaBreakdown.normal} cases
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-950 block">SLA Warning Threshold</span>
                <span className="text-[11px] text-amber-800">&lt;12 hours remaining before expiration</span>
              </div>
              <span className="text-lg font-mono font-bold text-amber-700">
                {slaBreakdown.warning} cases
              </span>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-rose-950 block">SLA Breached (Escalated)</span>
                <span className="text-[11px] text-rose-800">Turnaround window exceeded deadline</span>
              </div>
              <span className="text-lg font-mono font-bold text-rose-700">
                {slaBreakdown.breached} cases
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DEPARTMENT WORKLOAD REGISTER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Department Operations & Workload Allocation
            </h3>
            <p className="text-xs text-slate-500">
              Real-time active case distribution across municipal bureaus
            </p>
          </div>
          <Building className="w-4 h-4 text-slate-400" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {departments.map((dept: any) => (
            <div key={dept.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                {dept.code}
              </span>
              <h4 className="font-bold text-slate-900 text-sm">{dept.name}</h4>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-600">
                <span>Active Cases:</span>
                <span className="font-bold text-slate-900 font-mono">{dept.incidentCount}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Operational Teams:</span>
                <span className="font-bold text-slate-900 font-mono">{dept.teamsCount}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Combined Workload:</span>
                <span className="font-bold text-blue-600 font-mono">{dept.totalWorkload} tasks</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RECURRING PROBLEM HYPOTHESIS REGISTER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <RotateCcw className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                AI Detected Recurring Problem Hot-Spots
              </h3>
              <p className="text-xs text-slate-500">
                Spatial-temporal clustering hypothesis engine detecting repeated failures in the same areas.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200">
            {recurring.length} Hot-Spots Detected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {recurring.map((cluster) => (
            <div
              key={cluster.id}
              className="p-4 rounded-xl border border-orange-200/80 bg-orange-50/40 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  {cluster.title}
                </span>
                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-orange-100 text-orange-800">
                  {cluster.totalIncidents} Correlated Incidents
                </span>
              </div>

              <p className="text-slate-700 leading-relaxed">
                <strong className="text-orange-950">Hypothesized Root Cause:</strong> {cluster.rootCauseHypothesis}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-orange-200/60 text-[11px] text-slate-500">
                <span>Sector: {cluster.areaName}</span>
                <span className="font-semibold text-orange-800">
                  AI Confidence: {Math.round(cluster.confidenceScore * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
