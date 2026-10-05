"use client";

import React, { useState } from "react";
import { Sparkles, Send, HelpCircle, CheckCircle, Database } from "lucide-react";

const SUGGESTED_QUERIES = [
  "Which area has the most unresolved road problems?",
  "Which department has the highest workload?",
  "What are the oldest critical cases?",
  "Which problems are recurring?",
  "How many reports were resolved this month?",
];

export function AskCivicAi() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    answer: string;
    citations: string[];
    isSufficientData: boolean;
  } | null>(null);

  const handleAsk = async (textToQuery?: string) => {
    const q = textToQuery || query;
    if (!q.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setResult({
          answer: data.error || "Failed to analyze data.",
          citations: [],
          isSufficientData: false,
        });
      }
    } catch {
      setResult({
        answer: "Network error querying civic intelligence.",
        citations: [],
        isSufficientData: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-center space-x-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            CivicOS Natural-Language Telemetry Assistant
          </h3>
          <p className="text-xs text-slate-500">
            Ask questions directly grounded against real city database records.
          </p>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SUGGESTED_QUERIES.map((sq, i) => (
          <button
            key={i}
            onClick={() => {
              setQuery(sq);
              handleAsk(sq);
            }}
            className="text-[11px] bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 rounded-full px-3 py-1 transition-colors text-left"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Query Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="E.g., Which department has the highest workload?"
            className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 pr-10 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>{loading ? "Querying..." : "Analyze"}</span>
        </button>
      </form>

      {/* Result Display */}
      {result && (
        <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50/70 animate-in fade-in duration-150">
          <div className="flex items-center space-x-1.5 mb-2">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Verified Database Response
            </span>
          </div>
          <div
            className="text-xs text-slate-800 leading-relaxed font-sans"
            dangerouslySetInnerHTML={{
              __html: result.answer.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
            }}
          />

          {result.citations && result.citations.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
              <span className="font-semibold">Grounding:</span>
              {result.citations.map((cite, i) => (
                <span
                  key={i}
                  className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[10px]"
                >
                  {cite}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
