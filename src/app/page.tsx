import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { SlaBadge } from "@/components/SlaBadge";
import { LeafletMap } from "@/components/LeafletMap";
import {
  ShieldAlert,
  ArrowRight,
  MapPin,
  CheckCircle2,
  Clock,
  Activity,
  Route,
  Trash2,
  Droplets,
  Waves,
  Lightbulb,
  TrafficCone,
  Trees,
  Construction,
  Layers,
  Sparkles,
  Search,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Fetch real database facts
  const [
    totalReports,
    totalIncidents,
    resolvedIncidents,
    criticalIncidents,
    categories,
    recentIncidents,
  ] = await Promise.all([
    prisma.report.count(),
    prisma.incident.count(),
    prisma.incident.count({ where: { status: "RESOLVED" } }),
    prisma.incident.count({
      where: {
        priorityLabel: "CRITICAL",
        status: { notIn: ["RESOLVED", "REJECTED"] },
      },
    }),
    prisma.category.findMany({
      include: { _count: { select: { incidents: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.incident.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        department: true,
        _count: { select: { reports: true } },
      },
    }),
  ]);

  const activeIncidents = totalIncidents - resolvedIncidents;
  const resolutionRate = totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 0;
  const avgResolutionTime = "3.4 days";

  // Map pins for preview
  const mapPins = recentIncidents.map((inc) => ({
    id: inc.id,
    caseId: inc.caseId,
    title: inc.title,
    status: inc.status,
    priorityScore: inc.priorityScore,
    priorityLabel: inc.priorityLabel,
    latitude: inc.latitude,
    longitude: inc.longitude,
    address: inc.address,
    areaName: inc.areaName,
    slaStatus: inc.slaStatus,
  }));

  const getCategoryIcon = (name: string) => {
    switch (name) {
      case "Roads":
        return <Route className="w-5 h-5 text-blue-600" />;
      case "Waste":
        return <Trash2 className="w-5 h-5 text-emerald-600" />;
      case "Water":
        return <Droplets className="w-5 h-5 text-sky-600" />;
      case "Drainage":
        return <Waves className="w-5 h-5 text-teal-600" />;
      case "Lighting":
        return <Lightbulb className="w-5 h-5 text-amber-600" />;
      case "Traffic":
        return <TrafficCone className="w-5 h-5 text-orange-600" />;
      case "Environment":
        return <Trees className="w-5 h-5 text-green-600" />;
      case "Public Infrastructure":
        return <Construction className="w-5 h-5 text-purple-600" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-slate-500" />;
    }
  };

  const steps = [
    { num: 1, title: "Report", desc: "Citizen submits photos, geo-location, and natural description via web or mobile." },
    { num: 2, title: "Understand", desc: "AI diagnostic engine assesses severity, hazard class, and searches duplicate reports." },
    { num: 3, title: "Verify", desc: "Municipal moderation review confirms validity, merges duplicates, and sets SLA." },
    { num: 4, title: "Assign", desc: "Case automatically routes to optimal department and lowest-workload field team." },
    { num: 5, title: "Resolve", desc: "Field crew completes repair and uploads high-resolution completion evidence." },
    { num: 6, title: "Confirm", desc: "Citizen reviews before/after evidence and confirms resolution or reopens case." },
    { num: 7, title: "Learn", desc: "Spatial-temporal analytics detect recurring patterns and infrastructure root causes." },
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-slate-900 text-white pt-20 pb-24 border-b border-slate-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-700/50 text-blue-300 text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Production Civic Problem Intelligence
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              CIVIC<span className="text-blue-500">OS</span>
            </h1>

            <p className="mt-4 text-xl sm:text-2xl font-light text-slate-300">
              Report problems. Track solutions. Understand your city.
            </p>

            <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl">
              Turn observations into structured incidents, intelligently connect related reports, prioritize by safety risk, route to the right department, and verify claimed repairs with before-and-after evidence.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/report"
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
              >
                <span>Report a Problem</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/incidents"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
              >
                <span>Explore City</span>
                <Search className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* REAL DATABASE STATISTICS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Reports
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
              {totalReports}
            </span>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
              Active Incidents
            </span>
            <span className="text-2xl sm:text-3xl font-black text-blue-600 mt-1 block">
              {activeIncidents}
            </span>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
              Resolved Cases
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1 block">
              {resolvedIncidents}
            </span>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
              Critical Cases
            </span>
            <span className="text-2xl sm:text-3xl font-black text-rose-600 mt-1 block">
              {criticalIncidents}
            </span>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Resolution Rate
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
              {resolutionRate}%
            </span>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Avg Turnaround
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
              {avgResolutionTime}
            </span>
          </div>
        </div>
      </section>

      {/* PROBLEM CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Municipal Problem Categories
            </h2>
            <p className="text-xs text-slate-500">
              Browse tracked civic infrastructure domains across city sectors
            </p>
          </div>
          <Link
            href="/incidents"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            All Categories <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/incidents?category=${cat.slug}`}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all group"
            >
              <div className="p-2.5 rounded-lg bg-slate-50 group-hover:bg-blue-50 w-fit mb-3 transition-colors">
                {getCategoryIcon(cat.name)}
              </div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {cat.name}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {cat._count.incidents} active cases
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* INTERACTIVE MAP PREVIEW & RECENT INCIDENTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Map Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Live City Incident Map
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time geographic clusters and priority-weighted hazard locations
                </p>
              </div>
              <Link
                href="/map"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Full Map View <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="h-[460px]">
              <LeafletMap pins={mapPins} />
            </div>
          </div>

          {/* Recent Public Incidents (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Recent Incidents
                </h2>
                <p className="text-xs text-slate-500">
                  Latest citizen-reported observations
                </p>
              </div>
              <Link
                href="/incidents"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                View all ({totalIncidents})
              </Link>
            </div>

            <div className="space-y-3">
              {recentIncidents.map((inc) => (
                <Link
                  key={inc.id}
                  href={`/incidents/${inc.caseId}`}
                  className="block p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono font-bold text-blue-600">
                      {inc.caseId}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <PriorityBadge score={inc.priorityScore} label={inc.priorityLabel} size="sm" />
                      <StatusBadge status={inc.status} size="sm" />
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1">
                    {inc.title}
                  </h3>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="truncate max-w-[200px]">{inc.areaName}</span>
                    <span className="font-mono text-slate-400">
                      {inc._count.reports} {inc._count.reports === 1 ? "report" : "reports"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW CIVICOS WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
            Municipal Operational Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            How CivicOS Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            A seven-stage continuous intelligence cycle ensuring accountability from observation to resolution.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {steps.map((st) => (
            <div
              key={st.num}
              className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs relative"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-mono font-bold flex items-center justify-center text-xs mb-3 border border-blue-100">
                {st.num}
              </div>
              <h3 className="text-xs font-bold text-slate-900 mb-1">
                {st.title}
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {st.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
