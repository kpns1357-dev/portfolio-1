"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  Shield,
  Clock,
  Sparkles,
  Database,
  Users,
  Building,
  CheckCircle2,
  Save,
  Layers,
  FileText,
} from "lucide-react";

export default function SuperAdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"sla" | "priority" | "ai" | "audit">("sla");

  // SLA State
  const [slaDurations, setSlaDurations] = useState({
    CRITICAL: 24,
    HIGH: 72,
    MEDIUM: 168,
    LOW: 336,
  });

  // Priority Weights State
  const [priorityWeights, setPriorityWeights] = useState({
    maxSeverity: 30,
    maxSafety: 25,
    maxMultiple: 12,
    maxTraffic: 8,
    maxDuration: 7,
    maxRecurrence: 5,
  });

  // AI Provider State
  const [aiProvider, setAiProvider] = useState({
    provider: "local",
    model: "CivicEngine-Deterministic-v2",
    endpoint: "http://localhost:11434",
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    // Load current system settings
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.slaDurations) setSlaDurations(data.slaDurations);
        if (data.priorityWeights) setPriorityWeights(data.priorityWeights);
        if (data.aiProvider) setAiProvider(data.aiProvider);
      })
      .catch(() => {});

    // Load audit logs
    fetch("/api/audit")
      .then((res) => res.json())
      .then((data) => setAuditLogs(data.logs || []))
      .catch(() => {});
  }, []);

  const saveSettings = async (key: string, value: any) => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        setFeedback("Configuration saved and activated across municipal services.");
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch {
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
          Super Administrator Control
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          System Architecture & Policy Engine
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Server-side enforced service-level agreements, deterministic priority weights, and immutable audit logs.
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 text-xs">
        <button
          onClick={() => setActiveTab("sla")}
          className={`pb-3 px-3 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "sla"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" /> SLA Deadlines
        </button>
        <button
          onClick={() => setActiveTab("priority")}
          className={`pb-3 px-3 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "priority"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sliders className="w-4 h-4" /> Priority Weights
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`pb-3 px-3 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "ai"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4" /> AI Diagnostics Provider
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`pb-3 px-3 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "audit"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" /> Audit Trails ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: SLA DURATIONS */}
      {activeTab === "sla" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6 max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Service-Level Agreement (SLA) Duration Policy
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Defines the mandatory resolution windows before automatic escalation records are triggered.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="font-bold text-slate-700 block">Critical Incidents (Hours)</label>
                <span className="text-[11px] text-slate-400">Default: 24 hours (Immediate dispatch)</span>
              </div>
              <input
                type="number"
                value={slaDurations.CRITICAL}
                onChange={(e) => setSlaDurations({ ...slaDurations, CRITICAL: parseInt(e.target.value) || 24 })}
                className="rounded-lg border border-slate-200 p-2.5 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="font-bold text-slate-700 block">High Priority (Hours)</label>
                <span className="text-[11px] text-slate-400">Default: 72 hours (3 days)</span>
              </div>
              <input
                type="number"
                value={slaDurations.HIGH}
                onChange={(e) => setSlaDurations({ ...slaDurations, HIGH: parseInt(e.target.value) || 72 })}
                className="rounded-lg border border-slate-200 p-2.5 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="font-bold text-slate-700 block">Medium Priority (Hours)</label>
                <span className="text-[11px] text-slate-400">Default: 168 hours (7 days)</span>
              </div>
              <input
                type="number"
                value={slaDurations.MEDIUM}
                onChange={(e) => setSlaDurations({ ...slaDurations, MEDIUM: parseInt(e.target.value) || 168 })}
                className="rounded-lg border border-slate-200 p-2.5 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="font-bold text-slate-700 block">Low Priority (Hours)</label>
                <span className="text-[11px] text-slate-400">Default: 336 hours (14 days)</span>
              </div>
              <input
                type="number"
                value={slaDurations.LOW}
                onChange={(e) => setSlaDurations({ ...slaDurations, LOW: parseInt(e.target.value) || 336 })}
                className="rounded-lg border border-slate-200 p-2.5 font-mono"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => saveSettings("slaDurations", slaDurations)}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save SLA Policy"}</span>
          </button>
        </div>
      )}

      {/* TAB 2: PRIORITY WEIGHTS */}
      {activeTab === "priority" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6 max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Deterministic Priority Scoring Engine Calibration
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Calibrate the algorithmic contribution of each factor to the final 0-100 score.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="font-bold text-slate-700 block">Severity Factor Contribution</label>
                <span className="text-[11px] text-slate-400">Max points (+30 max)</span>
              </div>
              <input
                type="number"
                value={priorityWeights.maxSeverity}
                onChange={(e) => setPriorityWeights({ ...priorityWeights, maxSeverity: parseInt(e.target.value) || 30 })}
                className="rounded-lg border border-slate-200 p-2.5 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="font-bold text-slate-700 block">Safety Risk Weight</label>
                <span className="text-[11px] text-slate-400">Max points (+25 max)</span>
              </div>
              <input
                type="number"
                value={priorityWeights.maxSafety}
                onChange={(e) => setPriorityWeights({ ...priorityWeights, maxSafety: parseInt(e.target.value) || 25 })}
                className="rounded-lg border border-slate-200 p-2.5 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="font-bold text-slate-700 block">Multiple Corroborating Reports</label>
                <span className="text-[11px] text-slate-400">Max points (+12 max)</span>
              </div>
              <input
                type="number"
                value={priorityWeights.maxMultiple}
                onChange={(e) => setPriorityWeights({ ...priorityWeights, maxMultiple: parseInt(e.target.value) || 12 })}
                className="rounded-lg border border-slate-200 p-2.5 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="font-bold text-slate-700 block">Traffic / Arterial Exposure</label>
                <span className="text-[11px] text-slate-400">Max points (+8 max)</span>
              </div>
              <input
                type="number"
                value={priorityWeights.maxTraffic}
                onChange={(e) => setPriorityWeights({ ...priorityWeights, maxTraffic: parseInt(e.target.value) || 8 })}
                className="rounded-lg border border-slate-200 p-2.5 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="font-bold text-slate-700 block">Time Duration Escalation</label>
                <span className="text-[11px] text-slate-400">Max points (+7 max)</span>
              </div>
              <input
                type="number"
                value={priorityWeights.maxDuration}
                onChange={(e) => setPriorityWeights({ ...priorityWeights, maxDuration: parseInt(e.target.value) || 7 })}
                className="rounded-lg border border-slate-200 p-2.5 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="font-bold text-slate-700 block">Recurrence / Chronic Signal</label>
                <span className="text-[11px] text-slate-400">Max points (+5 max)</span>
              </div>
              <input
                type="number"
                value={priorityWeights.maxRecurrence}
                onChange={(e) => setPriorityWeights({ ...priorityWeights, maxRecurrence: parseInt(e.target.value) || 5 })}
                className="rounded-lg border border-slate-200 p-2.5 font-mono"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => saveSettings("priorityWeights", priorityWeights)}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Update Scoring Calibration"}</span>
          </button>
        </div>
      )}

      {/* TAB 3: AI DIAGNOSTICS PROVIDER */}
      {activeTab === "ai" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6 max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              AI Diagnostic Provider Architecture
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              CivicOS abstracts LLM providers. Easily swap between local offline inference, Ollama, or remote OpenAI-compatible endpoints.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Inference Engine</label>
              <select
                value={aiProvider.provider}
                onChange={(e) => setAiProvider({ ...aiProvider, provider: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2.5 bg-white"
              >
                <option value="local">Local Civic Diagnostic Engine (Built-in deterministic)</option>
                <option value="ollama">Ollama Local Self-Hosted LLM</option>
                <option value="openai">OpenAI Compatible Gateway</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Model Identifier</label>
              <input
                type="text"
                value={aiProvider.model}
                onChange={(e) => setAiProvider({ ...aiProvider, model: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2.5 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Local Daemon Endpoint</label>
              <input
                type="text"
                value={aiProvider.endpoint}
                onChange={(e) => setAiProvider({ ...aiProvider, endpoint: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2.5 font-mono"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => saveSettings("aiProvider", aiProvider)}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Activate AI Provider"}</span>
          </button>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === "audit" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Immutable System Audit Trails ({auditLogs.length})
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Server-logged operational provenance
            </span>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">State Transition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-sans font-semibold text-slate-800">
                      {log.actorName} ({log.actorRole})
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-blue-600 font-bold whitespace-nowrap">
                      {log.entityType}: {log.entityId}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate font-sans">
                      {log.newState || log.previousState || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
