"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  ShieldAlert,
  Flame,
  Wrench,
  UserCheck,
} from "lucide-react";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { SlaBadge } from "@/components/SlaBadge";

export default function AuthorityDashboardPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Quick Action
  const [filterDept, setFilterDept] = useState("");
  const [filterSla, setFilterSla] = useState("");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [incRes, deptRes, statsRes] = await Promise.all([
        fetch("/api/incidents?limit=50&sortBy=priority"),
        fetch("/api/departments"),
        fetch("/api/analytics/stats"),
      ]);

      if (incRes.ok) {
        const d = await incRes.json();
        setIncidents(d.incidents || []);
      }
      if (deptRes.ok) {
        const d = await deptRes.json();
        setDepartments(d.departments || []);
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeIncidents = incidents.filter((i) => !["RESOLVED", "REJECTED"].includes(i.status));
  const criticalCount = activeIncidents.filter((i) => i.priorityLabel === "CRITICAL").length;
  const highCount = activeIncidents.filter((i) => i.priorityLabel === "HIGH").length;
  const unassignedCount = activeIncidents.filter((i) => !i.teamId).length;
  const slaWarningCount = activeIncidents.filter((i) => i.slaStatus === "WARNING").length;
  const slaBreachedCount = activeIncidents.filter((i) => i.slaStatus === "BREACHED").length;
  const pendingInspectionCount = activeIncidents.filter((i) => i.status === "INSPECTION_PENDING").length;
  const pendingVerificationCount = activeIncidents.filter((i) => i.status === "VERIFICATION_PENDING").length;

  const filteredQueue = activeIncidents.filter((inc) => {
    if (filterDept && inc.departmentId !== filterDept) return false;
    if (filterSla && inc.slaStatus !== filterSla) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        inc.caseId.toLowerCase().includes(s) ||
        inc.title.toLowerCase().includes(s) ||
        inc.address.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
            Municipal Operations Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Authority Command & Dispatch Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time workload telemetry, SLA escalation warnings, and priority task queue.
          </p>
        </div>

        <button
          onClick={loadData}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs w-fit"
        >
          Refresh Feed
        </button>
      </div>

      {/* OPERATIONS KPI GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Queue</span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">{activeIncidents.length}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Critical</span>
          <span className="text-xl font-black text-rose-700 mt-0.5 block">{criticalCount}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">High Priority</span>
          <span className="text-xl font-black text-amber-800 mt-0.5 block">{highCount}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 shadow-2xs">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Unassigned</span>
          <span className="text-xl font-black text-purple-700 mt-0.5 block">{unassignedCount}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">SLA Warnings</span>
          <span className="text-xl font-black text-amber-800 mt-0.5 block">{slaWarningCount}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-rose-300 bg-rose-100 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider block">SLA Breaches</span>
          <span className="text-xl font-black text-rose-900 mt-0.5 block">{slaBreachedCount}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/50 shadow-2xs">
          <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">Inspections</span>
          <span className="text-xl font-black text-sky-800 mt-0.5 block">{pendingInspectionCount}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 shadow-2xs">
          <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Citizen Verif.</span>
          <span className="text-xl font-black text-teal-800 mt-0.5 block">{pendingVerificationCount}</span>
        </div>
      </div>

      {/* DEPARTMENT WORKLOAD ALLOCATION */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Building className="w-4 h-4 text-indigo-600" />
          Department Workload Balancer
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
          {departments.map((d) => {
            const isSelected = filterDept === d.id;
            const deptIncidents = incidents.filter((i) => i.departmentId === d.id);
            const totalLoad = d.teams.reduce((acc: number, t: any) => acc + t.activeWorkload, 0);

            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setFilterDept(isSelected ? "" : d.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600"
                    : "border-slate-200 bg-slate-50/40 hover:border-slate-300"
                }`}
              >
                <span className="text-[10px] font-bold text-slate-400 font-mono block">
                  {d.code}
                </span>
                <span className="font-bold text-slate-900 block truncate">{d.name}</span>
                <span className="text-[11px] text-blue-600 font-semibold block mt-1">
                  {totalLoad} tasks active
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SMART WORK QUEUE */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden space-y-4">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Prioritized Smart Work Queue ({filteredQueue.length})
            </h3>
            <p className="text-xs text-slate-500">
              Ranked deterministically by safety risk, hazard class, and SLA urgency.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter queue..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
              />
            </div>

            <select
              value={filterSla}
              onChange={(e) => setFilterSla(e.target.value)}
              className="rounded-lg border border-slate-200 text-xs py-1.5 px-2 bg-slate-50 text-slate-700"
            >
              <option value="">All SLA</option>
              <option value="BREACHED">Breached Only</option>
              <option value="WARNING">Urgent Warnings</option>
              <option value="NORMAL">Normal</option>
            </select>
          </div>
        </div>

        {/* Table of Queue */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400">
              <tr>
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Problem & Category</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">SLA Time</th>
                <th className="py-3 px-4">Assigned Team</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQueue.map((inc) => (
                <tr key={inc.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">
                    {inc.caseId}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 block line-clamp-1">
                      {inc.title}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {inc.category?.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-[180px] truncate text-slate-500">
                    {inc.address}
                  </td>
                  <td className="py-3 px-4">
                    <PriorityBadge score={inc.priorityScore} label={inc.priorityLabel} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={inc.status} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    <SlaBadge slaStatus={inc.slaStatus} statusText={inc.slaInfo?.statusText} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    {inc.team ? (
                      <span className="font-semibold text-slate-800">{inc.team.name}</span>
                    ) : (
                      <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded text-[11px]">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/incidents/${inc.caseId}`}
                      className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md font-semibold text-xs transition-colors"
                    >
                      Manage <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
