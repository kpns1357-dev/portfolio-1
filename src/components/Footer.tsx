import React from "react";
import Link from "next/link";
import { ShieldAlert, ExternalLink, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className="text-base font-black tracking-tight text-slate-900">
                CIVIC<span className="text-blue-600">OS</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Report problems. Track solutions. Understand your city. A modern municipal problem intelligence platform connecting citizens and authorities.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Citizen Services
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link href="/report" className="hover:text-blue-600">
                  Report a Problem
                </Link>
              </li>
              <li>
                <Link href="/incidents" className="hover:text-blue-600">
                  Track Existing Case
                </Link>
              </li>
              <li>
                <Link href="/map" className="hover:text-blue-600">
                  Explore City Map
                </Link>
              </li>
              <li>
                <Link href="/dashboard/citizen" className="hover:text-blue-600">
                  My Reports & Verification
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Municipal Operations
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link href="/dashboard/authority" className="hover:text-blue-600">
                  Authority Operations Queue
                </Link>
              </li>
              <li>
                <Link href="/dashboard/moderation" className="hover:text-blue-600">
                  Moderation & Duplicate Merge
                </Link>
              </li>
              <li>
                <Link href="/dashboard/admin" className="hover:text-blue-600">
                  SLA & Priority Settings
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="hover:text-blue-600">
                  Public Transparency Data
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Architecture & Transparency
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-2">
              CivicOS operates with full audit logging, open APIs, Leaflet GIS mapping, and deterministic scoring.
            </p>
            <div className="flex items-center text-[11px] text-slate-400">
              <span>Production Civic Intelligence v1.0</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 CivicOS Public Technology Initiative. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 flex items-center gap-1">
            Engineered for resilient municipal civic infrastructure.
          </p>
        </div>
      </div>
    </footer>
  );
}
