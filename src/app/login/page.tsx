"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, LogIn, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
      } else {
        // Redirect based on role
        if (data.user.role === "CITIZEN") router.push("/dashboard/citizen");
        else if (data.user.role === "AUTHORITY") router.push("/dashboard/authority");
        else if (data.user.role === "MODERATOR") router.push("/dashboard/moderation");
        else if (data.user.role === "SUPER_ADMIN") router.push("/dashboard/admin");
        else router.push("/");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Sign in to CivicOS
          </h1>
          <p className="text-xs text-slate-500">
            Municipal problem intelligence and case tracking platform
          </p>
        </div>

        {/* Demo Fast Login Buttons */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Instant Demo Account Switcher
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickDemo("citizen@civicos.org")}
              className="p-2 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-800 text-left font-semibold transition-colors"
            >
              <span>Alex (Citizen)</span>
              <span className="text-[10px] text-blue-600 block font-normal">Report & verify</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("authority@civicos.org")}
              className="p-2 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/60 text-indigo-800 text-left font-semibold transition-colors"
            >
              <span>Sarah (Authority)</span>
              <span className="text-[10px] text-indigo-600 block font-normal">Dispatch & repairs</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("moderator@civicos.org")}
              className="p-2 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 text-amber-800 text-left font-semibold transition-colors"
            >
              <span>Julian (Moderator)</span>
              <span className="text-[10px] text-amber-600 block font-normal">Queue & merge</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("admin@civicos.org")}
              className="p-2 rounded-lg border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 text-purple-800 text-left font-semibold transition-colors"
            >
              <span>Eleanor (Admin)</span>
              <span className="text-[10px] text-purple-600 block font-normal">Full settings</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. citizen@civicos.org"
              required
              className="w-full rounded-xl border border-slate-200 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-slate-200 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? "Authenticating..." : "Sign In to CivicOS"}</span>
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Don't have an account yet?{" "}
          <Link href="/register" className="text-blue-600 font-bold hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
