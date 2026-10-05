"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldAlert,
  MapPin,
  BarChart3,
  PlusCircle,
  UserCheck,
  Building2,
  FileCheck2,
  Sliders,
  LogOut,
  LogIn,
  ChevronDown,
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchMe();
  }, [pathname]);

  const switchDemoRole = async (email: string) => {
    setRoleMenuOpen(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123" }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        router.refresh();
      }
    } catch (err) {
      console.error("Quick switch error:", err);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & CivicOS Title */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                  CIVIC<span className="text-blue-600">OS</span>
                </span>
                <span className="text-[10px] tracking-wide text-slate-500 uppercase font-semibold">
                  Problem Intelligence
                </span>
              </div>
            </Link>

            {/* Main Nav Links */}
            <div className="hidden md:flex items-center space-x-1 pl-6">
              <Link
                href="/incidents"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                  pathname.startsWith("/incidents")
                    ? "bg-slate-100 text-blue-600 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Cases
              </Link>
              <Link
                href="/map"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                  pathname === "/map"
                    ? "bg-slate-100 text-blue-600 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" /> City Map
              </Link>
              <Link
                href="/analytics"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                  pathname === "/analytics"
                    ? "bg-slate-100 text-blue-600 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Analytics & AI
              </Link>

              {/* Role specific dashboard link */}
              {user && (
                <>
                  {user.role === "CITIZEN" && (
                    <Link
                      href="/dashboard/citizen"
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                        pathname === "/dashboard/citizen"
                          ? "bg-blue-50 text-blue-700 font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      My Reports
                    </Link>
                  )}
                  {(user.role === "AUTHORITY" || user.role === "SUPER_ADMIN") && (
                    <Link
                      href="/dashboard/authority"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                        pathname === "/dashboard/authority"
                          ? "bg-indigo-50 text-indigo-700 font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Operations
                    </Link>
                  )}
                  {(user.role === "MODERATOR" || user.role === "SUPER_ADMIN") && (
                    <Link
                      href="/dashboard/moderation"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                        pathname === "/dashboard/moderation"
                          ? "bg-amber-50 text-amber-800 font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-amber-600" /> Moderation
                    </Link>
                  )}
                  {user.role === "SUPER_ADMIN" && (
                    <Link
                      href="/dashboard/admin"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                        pathname === "/dashboard/admin"
                          ? "bg-purple-50 text-purple-700 font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5 text-purple-600" /> System
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center space-x-3">
            {/* Primary Action: Report a Problem */}
            <Link
              href="/report"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Problem</span>
            </Link>

            {/* Notification Bell */}
            {user && <NotificationBell />}

            {/* Quick Demo Switcher & Account Menu */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[11px]">
                  {user ? user.name.charAt(0) : "G"}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-[11px] font-bold text-slate-900 leading-none">
                    {user ? user.name.split(" ")[0] : "Demo Switcher"}
                  </span>
                  <span className="text-[9px] text-blue-600 font-semibold uppercase leading-tight">
                    {user ? user.role.replace("_", " ") : "Switch Role"}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl py-2 z-50 animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Demo Role Switcher
                    </p>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <button
                      onClick={() => switchDemoRole("citizen@civicos.org")}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-blue-50 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">Alex Rivera</span>
                        <p className="text-[11px] text-slate-500">Citizen (Reporting & Verifying)</p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">CITIZEN</span>
                    </button>

                    <button
                      onClick={() => switchDemoRole("authority@civicos.org")}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-indigo-50 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">Dir. Sarah Ross</span>
                        <p className="text-[11px] text-slate-500">Authority (Dispatch & Evidence)</p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">AUTHORITY</span>
                    </button>

                    <button
                      onClick={() => switchDemoRole("moderator@civicos.org")}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-amber-50 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">Julian Thorne</span>
                        <p className="text-[11px] text-slate-500">Moderator (Queue & Merge)</p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">MODERATOR</span>
                    </button>

                    <button
                      onClick={() => switchDemoRole("admin@civicos.org")}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-purple-50 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">Eleanor Sterling</span>
                        <p className="text-[11px] text-slate-500">Super Admin (Full Config)</p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">ADMIN</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 mt-1 pt-1 px-1">
                    {user ? (
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        onClick={() => setRoleMenuOpen(false)}
                        className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
                      >
                        <LogIn className="w-3.5 h-3.5" /> Sign In
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
