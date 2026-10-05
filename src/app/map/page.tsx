"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LeafletMap, MapPinData } from "@/components/LeafletMap";
import { Filter, Layers, Flame, RefreshCw, ArrowLeft } from "lucide-react";

export default function CityMapPage() {
  const [pins, setPins] = useState<MapPinData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  const loadPins = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        forMap: "true",
        category,
        status,
        priority,
      });
      const res = await fetch(`/api/incidents?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPins(data.pins || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPins();
  }, [category, status, priority]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 z-10 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Link
              href="/incidents"
              className="text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Link>
            <span className="text-sm font-black text-slate-900 tracking-tight hidden sm:inline">
              Civic Geographic Intelligence Map
            </span>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="VERIFICATION_PENDING">Verification Pending</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REOPENED">Reopened</option>
            </select>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical (75-100)</option>
              <option value="HIGH">High (50-74)</option>
              <option value="MEDIUM">Medium (25-49)</option>
              <option value="LOW">Low (0-24)</option>
            </select>

            <span className="text-xs text-slate-500 font-mono pl-2">
              {loading ? "Loading..." : `${pins.length} pins rendered`}
            </span>
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 w-full relative">
        <LeafletMap pins={pins} showHeatmapToggle={true} />
      </div>
    </div>
  );
}
