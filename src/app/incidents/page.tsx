"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { SlaBadge } from "@/components/SlaBadge";

export const dynamic = "force-dynamic";

export default function IncidentsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading cases...</div>}>
      <IncidentsExplorer />
    </Suspense>
  );
}

function IncidentsExplorer() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [incidents, setIncidents] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [priority, setPriority] = useState(searchParams.get("priority") || "");
  const [slaStatus, setSlaStatus] = useState(searchParams.get("slaStatus") || "");
  const [sortBy, setSortBy] = useState("priority");
  const [page, setPage] = useState(1);

  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategoriesList(data.categories || []))
      .catch(() => {});
  }, []);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: "12",
        search,
        category,
        status,
        priority,
        slaStatus,
        sortBy,
      });

      const res = await fetch(`/api/incidents?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error("Load incidents error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [page, category, status, priority, slaStatus, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadIncidents();
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setStatus("");
    setPriority("");
    setSlaStatus("");
    setSortBy("priority");
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
            City Incident Registry
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Explore Municipal Cases
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time verified civic problems aggregated from citizen observations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/map"
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>Map View</span>
          </Link>
          <Link
            href="/report"
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span>+ Report Problem</span>
          </Link>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Case ID (e.g. CF-2026-28491), keyword, street, or area..."
              className="w-full text-xs rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>
          <button
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
          {/* Category */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categoriesList.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="REPORTED">Reported</option>
            <option value="VERIFIED">Verified</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="VERIFICATION_PENDING">Verification Pending</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REOPENED">Reopened</option>
          </select>

          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical (75-100)</option>
            <option value="HIGH">High (50-74)</option>
            <option value="MEDIUM">Medium (25-49)</option>
            <option value="LOW">Low (0-24)</option>
          </select>

          {/* SLA State */}
          <select
            value={slaStatus}
            onChange={(e) => {
              setSlaStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All SLA States</option>
            <option value="BREACHED">SLA Breached</option>
            <option value="WARNING">SLA Warning</option>
            <option value="NORMAL">Normal</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="priority">Sort: Highest Priority</option>
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="sla">Sort: SLA Urgency</option>
          </select>
        </div>

        {/* Clear Filters bar if any active */}
        {(category || status || priority || slaStatus || search) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing filtered results ({pagination.total} total cases)
            </span>
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* RESULTS LIST */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-medium">
            Querying municipal database...
          </p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No cases found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No incident records match the selected criteria. Try resetting filters or searching a different term.
          </p>
          <button
            onClick={clearFilters}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {incidents.map((inc) => (
            <Link
              key={inc.id}
              href={`/incidents/${inc.caseId}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all"
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-blue-600 group-hover:underline">
                    {inc.caseId}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <PriorityBadge score={inc.priorityScore} label={inc.priorityLabel} size="sm" />
                    <StatusBadge status={inc.status} size="sm" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {inc.title}
                </h3>

                {/* Description snippet */}
                <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                  {inc.description}
                </p>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{inc.address}</span>
                </div>
              </div>

              {/* Footer info: Reports count, SLA status, department */}
              <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <SlaBadge slaStatus={inc.slaStatus} statusText={inc.slaInfo?.statusText} size="sm" />

                <span className="text-[11px] font-mono text-slate-400">
                  {inc.reports?.length || 1} {inc.reports?.length === 1 ? "report" : "reports"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} cases)
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-40 text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-40 text-slate-600 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
