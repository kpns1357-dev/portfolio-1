import React from "react";
import { format } from "date-fns";
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Users,
  Search,
  Wrench,
  UserCheck,
  CheckCheck,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";

interface StatusHistoryItem {
  id: string;
  fromStatus: string;
  toStatus: string;
  actorName: string;
  actorRole: string;
  reason?: string | null;
  evidenceId?: string | null;
  createdAt: string;
}

interface IncidentTimelineProps {
  history: StatusHistoryItem[];
  evidenceList?: any[];
}

export function IncidentTimeline({ history, evidenceList = [] }: IncidentTimelineProps) {
  const getEventIcon = (toStatus: string) => {
    switch (toStatus) {
      case "REPORTED":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "VERIFIED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "ASSIGNED":
        return <Users className="w-4 h-4 text-indigo-600" />;
      case "INSPECTION_PENDING":
      case "IN_PROGRESS":
        return <Search className="w-4 h-4 text-sky-600" />;
      case "REPAIR_COMPLETED":
        return <Wrench className="w-4 h-4 text-teal-600" />;
      case "VERIFICATION_PENDING":
        return <UserCheck className="w-4 h-4 text-amber-600" />;
      case "RESOLVED":
        return <CheckCheck className="w-4 h-4 text-emerald-600" />;
      case "REOPENED":
        return <RotateCcw className="w-4 h-4 text-rose-600" />;
      case "ESCALATED":
        return <AlertTriangle className="w-4 h-4 text-rose-700" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActorBadgeColor = (role: string) => {
    switch (role) {
      case "CITIZEN":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "MODERATOR":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "AUTHORITY":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "SUPER_ADMIN":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {history.map((event, index) => {
        const associatedEvidence = event.evidenceId
          ? evidenceList.find((e) => e.id === event.evidenceId)
          : null;

        return (
          <div key={event.id || index} className="relative group">
            {/* Timeline Marker Dot */}
            <div className="absolute -left-[27px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 border-slate-300 shadow-xs group-hover:border-blue-500 transition-colors">
              {getEventIcon(event.toStatus)}
            </div>

            {/* Event Card */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2">
                  <StatusBadge status={event.toStatus} size="sm" />
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold tracking-wide ${getActorBadgeColor(
                      event.actorRole
                    )}`}
                  >
                    {event.actorRole}: {event.actorName}
                  </span>
                </div>
                <time className="text-xs text-slate-400 font-mono">
                  {format(new Date(event.createdAt), "MMM d, yyyy · h:mm a")}
                </time>
              </div>

              {event.reason && (
                <p className="text-xs text-slate-700 leading-relaxed mt-1">
                  {event.reason}
                </p>
              )}

              {/* Thumbnail of evidence linked to this event */}
              {associatedEvidence && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center space-x-3">
                  <img
                    src={associatedEvidence.url}
                    alt="Event proof"
                    className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                  />
                  <div className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700 block">
                      Attached Evidence:
                    </span>
                    <span>{associatedEvidence.filename}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
